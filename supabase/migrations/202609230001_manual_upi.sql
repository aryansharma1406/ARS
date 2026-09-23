BEGIN;

-- Keep PENDING/PAID in the existing ledger: all accounting, inventory and
-- scanner rules continue to use their established statuses.
CREATE TABLE public.manual_upi_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 hold_minutes integer NOT NULL DEFAULT 60 CHECK (hold_minutes BETWEEN 5 AND 1440),
 updated_by uuid REFERENCES public.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.manual_upi_settings(id) VALUES(true);
CREATE TABLE public.manual_upi_payments (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id),
 customer_id uuid NOT NULL REFERENCES public.users(id),
 request_id uuid NOT NULL,
 utr text UNIQUE CHECK (utr IS NULL OR utr ~ '^[A-Z0-9]{6,64}$'),
 state text NOT NULL DEFAULT 'AWAITING_UTR' CHECK (state IN ('AWAITING_UTR','PENDING','VERIFIED','REJECTED')),
 submitted_at timestamptz,
 hold_minutes integer,
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES public.users(id),
 review_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,request_id)
);
CREATE TABLE public.manual_upi_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid REFERENCES public.orders(id),
 actor_id uuid NOT NULL REFERENCES public.users(id),
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.manual_upi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_upi_settings,public.manual_upi_payments,public.manual_upi_audit FROM anon,authenticated;
GRANT SELECT ON public.manual_upi_settings,public.manual_upi_payments,public.manual_upi_audit TO authenticated;
CREATE POLICY manual_settings_read ON public.manual_upi_settings FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY manual_payments_read ON public.manual_upi_payments FOR SELECT TO authenticated USING(public.is_admin() OR (public.app_role()='customer' AND customer_id=auth.uid()));
CREATE POLICY manual_audit_read ON public.manual_upi_audit FOR SELECT TO authenticated USING(public.is_admin());
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.manual_upi_audit FOR EACH ROW EXECUTE FUNCTION public.immutable_audit();

CREATE FUNCTION public.reserve_manual_upi(target_customer uuid,target_event uuid,target_tier uuid,ticket_quantity integer,guest_name text,guest_phone text,referral_code text,discount_code text,expected_total numeric,visit_id uuid,request_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders; existing_id uuid;
BEGIN
 IF request_key IS NULL THEN RAISE EXCEPTION 'Request ID required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_customer::text||request_key::text,0));
 SELECT order_id INTO existing_id FROM public.manual_upi_payments WHERE customer_id=target_customer AND request_id=request_key;
 IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
 ord:=public.reserve_tier_order(target_customer,target_event,target_tier,ticket_quantity,guest_name,guest_phone,referral_code,discount_code,expected_total,visit_id);
 PERFORM public.bind_payment_order(target_customer,ord.id,'manual_upi_order_'||ord.id::text);
 INSERT INTO public.manual_upi_payments(order_id,customer_id,request_id) VALUES(ord.id,target_customer,request_key);
 INSERT INTO public.manual_upi_audit(order_id,actor_id,action) VALUES(ord.id,target_customer,'created');
 RETURN ord.id;
END $$;

CREATE FUNCTION public.submit_manual_upi(target_order uuid,reference text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders; receipt public.manual_upi_payments; minutes integer; normalized text; checked_at timestamptz;
BEGIN
 IF public.app_role()<>'customer' OR public.app_role() IS NULL THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 normalized:=upper(btrim(reference));
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{6,64}$' THEN RAISE EXCEPTION 'Enter a valid UTR or transaction ID (6-64 letters or digits).' USING ERRCODE='22023'; END IF;
 SELECT * INTO ord FROM public.orders WHERE id=target_order AND customer_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO receipt FROM public.manual_upi_payments WHERE order_id=ord.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Manual payment required' USING ERRCODE='42501'; END IF;
 -- A retry of the same submission never extends its original deadline.
 IF receipt.utr=normalized THEN RETURN; END IF;
 IF receipt.state<>'AWAITING_UTR' OR ord.payment_status<>'PENDING' THEN RAISE EXCEPTION 'A reference has already been submitted or this order is closed.' USING ERRCODE='22023'; END IF;
 -- Use the same event lock as reservation creation before extending inventory.
 PERFORM 1 FROM public.events WHERE id=ord.event_id FOR UPDATE;
 checked_at:=clock_timestamp();
 IF ord.reservation_expires_at IS NULL OR ord.reservation_expires_at<=checked_at THEN RAISE EXCEPTION 'The payment window has expired. If you paid, contact ARS with your order ID and UTR. Do not pay again.' USING ERRCODE='22023'; END IF;
 SELECT hold_minutes INTO minutes FROM public.manual_upi_settings WHERE id=true;
 UPDATE public.manual_upi_payments SET utr=normalized,state='PENDING',submitted_at=checked_at,hold_minutes=minutes WHERE order_id=ord.id;
 UPDATE public.orders SET reservation_expires_at=checked_at+make_interval(mins=>minutes) WHERE id=ord.id;
 INSERT INTO public.manual_upi_audit(order_id,actor_id,action,details) VALUES(ord.id,auth.uid(),'submitted',jsonb_build_object('utr',normalized,'hold_minutes',minutes,'expires_at',checked_at+make_interval(mins=>minutes)));
END $$;

CREATE FUNCTION public.review_manual_upi(target_order uuid,approve boolean,note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders; receipt public.manual_upi_payments; evt public.events; ends_at timestamptz; checked_at timestamptz;
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF approve IS NULL OR length(btrim(coalesce(note,''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Add a verification or rejection note.' USING ERRCODE='22023'; END IF;
 SELECT * INTO ord FROM public.orders WHERE id=target_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='22023'; END IF;
 SELECT * INTO receipt FROM public.manual_upi_payments WHERE order_id=ord.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Manual payment not found' USING ERRCODE='22023'; END IF;
 IF receipt.state='VERIFIED' AND approve THEN RETURN; END IF;
 IF receipt.state='REJECTED' AND NOT approve THEN RETURN; END IF;
 IF receipt.state<>'PENDING' OR ord.payment_status<>'PENDING' THEN RAISE EXCEPTION 'This payment is not awaiting verification.' USING ERRCODE='22023'; END IF;
 SELECT * INTO evt FROM public.events WHERE id=ord.event_id FOR UPDATE;
 checked_at:=clock_timestamp();
 IF approve THEN
  IF ord.reservation_expires_at IS NULL OR ord.reservation_expires_at<=checked_at THEN RAISE EXCEPTION 'The hold has expired. Reconcile the payment separately; no pass can be issued.' USING ERRCODE='22023'; END IF;
  ends_at:=((evt.date+evt.end_time)+CASE WHEN evt.end_time<=evt.start_time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'Asia/Kolkata';
  IF ends_at IS NULL OR ends_at<=checked_at THEN RAISE EXCEPTION 'The event has ended. Reconcile the payment separately.' USING ERRCODE='22023'; END IF;
  -- Existing fulfillment owns paid status, tier capacity, individual ticket rows,
  -- group-pass creation triggers, and payment idempotency.
  PERFORM public.finalize_payment(ord.customer_id,ord.razorpay_order_id,'manual_upi_'||receipt.utr,round(ord.total*100)::bigint);
 ELSE
  UPDATE public.orders SET payment_status='FAILED',reservation_expires_at=checked_at WHERE id=ord.id;
 END IF;
 UPDATE public.manual_upi_payments SET state=CASE WHEN approve THEN 'VERIFIED' ELSE 'REJECTED' END,reviewed_at=checked_at,reviewed_by=auth.uid(),review_note=btrim(note) WHERE order_id=ord.id;
 INSERT INTO public.manual_upi_audit(order_id,actor_id,action,details) VALUES(ord.id,auth.uid(),CASE WHEN approve THEN 'verified' ELSE 'rejected' END,jsonb_build_object('utr',receipt.utr,'amount',ord.total,'note',btrim(note)));
END $$;

CREATE FUNCTION public.set_manual_upi_hold(minutes integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF minutes IS NULL OR minutes NOT BETWEEN 5 AND 1440 THEN RAISE EXCEPTION 'Choose 5 to 1440 minutes.' USING ERRCODE='22023'; END IF;
 UPDATE public.manual_upi_settings SET hold_minutes=minutes,updated_by=auth.uid(),updated_at=clock_timestamp() WHERE id=true;
 INSERT INTO public.manual_upi_audit(actor_id,action,details) VALUES(auth.uid(),'hold_changed',jsonb_build_object('minutes',minutes));
END $$;

-- Status is evaluated by the database clock. Expiry releases inventory through
-- the existing reservation_expires_at predicates, without a cron dependency.
CREATE FUNCTION public.manual_upi_list(target_order uuid DEFAULT NULL,page_number integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; minutes integer; checked_at timestamptz:=clock_timestamp();
BEGIN
 IF NOT coalesce(public.is_admin(),false) AND public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF page_number IS NULL OR page_number<0 OR page_number>100000 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 SELECT hold_minutes INTO minutes FROM public.manual_upi_settings WHERE id=true;
 SELECT coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) INTO result FROM (
  SELECT o.id,o.customer_name,o.customer_email,o.total,o.quantity,o.ticket_type,e.name AS event_name,
   p.utr,p.submitted_at,p.reviewed_at,p.reviewed_by,p.review_note,o.reservation_expires_at AS expires_at,
   CASE WHEN o.payment_status='REFUNDED' THEN 'REFUNDED'
    WHEN p.state IN ('VERIFIED','REJECTED') THEN p.state
    WHEN o.reservation_expires_at IS NULL OR o.reservation_expires_at<=checked_at OR o.payment_status<>'PENDING' THEN 'EXPIRED'
    ELSE p.state END AS state,
   (SELECT t.id FROM public.tickets t WHERE t.order_id=o.id ORDER BY t.id LIMIT 1) AS ticket_id
  FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id JOIN public.events e ON e.id=o.event_id
  WHERE (public.is_admin() OR p.customer_id=auth.uid()) AND (target_order IS NULL OR o.id=target_order)
  ORDER BY p.created_at DESC,o.id LIMIT 50 OFFSET page_number*50
 ) rows;
 RETURN jsonb_build_object('rows',result,'holdMinutes',minutes,'serverTime',checked_at);
END $$;

REVOKE ALL ON FUNCTION public.reserve_manual_upi(uuid,uuid,uuid,integer,text,text,text,text,numeric,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_manual_upi(uuid,uuid,uuid,integer,text,text,text,text,numeric,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.submit_manual_upi(uuid,text),public.review_manual_upi(uuid,boolean,text),public.set_manual_upi_hold(integer),public.manual_upi_list(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_upi(uuid,text),public.review_manual_upi(uuid,boolean,text),public.set_manual_upi_hold(integer),public.manual_upi_list(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
