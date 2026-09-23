BEGIN;
-- One public credential per multi-guest order. Existing ticket rows remain the
-- per-guest attendance ledger used by payments, capacity, CRM and settlements.
CREATE TABLE public.group_passes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
 customer_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
 customer_name text NOT NULL,
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
 qr_token text NOT NULL UNIQUE DEFAULT ('ars-group-'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')),
 purchased_quantity integer NOT NULL CHECK(purchased_quantity>1),
 checked_in_quantity integer NOT NULL DEFAULT 0 CHECK(checked_in_quantity>=0 AND checked_in_quantity<=purchased_quantity),
 remaining_quantity integer GENERATED ALWAYS AS (purchased_quantity-checked_in_quantity) STORED,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_passes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_passes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.group_passes TO authenticated;
CREATE POLICY group_pass_customer_read ON public.group_passes FOR SELECT TO authenticated
 USING((public.app_role()='customer' AND customer_id=auth.uid()) OR public.is_admin());

CREATE FUNCTION public.sync_group_pass() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders;
BEGIN
 SELECT * INTO ord FROM public.orders WHERE id=NEW.order_id;
 IF ord.quantity>1 THEN
  INSERT INTO public.group_passes(order_id,customer_id,customer_name,event_id,purchased_quantity)
  VALUES(ord.id,ord.customer_id,ord.customer_name,ord.event_id,ord.quantity) ON CONFLICT(order_id) DO NOTHING;
  PERFORM 1 FROM public.group_passes WHERE order_id=ord.id FOR UPDATE;
  UPDATE public.group_passes SET checked_in_quantity=(SELECT count(*) FROM public.tickets WHERE order_id=ord.id AND status='USED') WHERE order_id=ord.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_group_pass() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_group_pass AFTER INSERT OR UPDATE OF status ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.sync_group_pass();
INSERT INTO public.group_passes(order_id,customer_id,customer_name,event_id,purchased_quantity,checked_in_quantity)
 SELECT o.id,o.customer_id,o.customer_name,o.event_id,o.quantity,count(*) FILTER(WHERE t.status='USED')
 FROM public.orders o JOIN public.tickets t ON t.order_id=o.id WHERE o.quantity>1 GROUP BY o.id;

CREATE TABLE public.group_admissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),group_pass_id uuid NOT NULL REFERENCES public.group_passes(id),
 staff_id uuid NOT NULL REFERENCES public.users(id),assignment_id uuid NOT NULL REFERENCES public.venue_staff_assignments(id),
 venue_id uuid NOT NULL REFERENCES public.venues(id),event_id uuid NOT NULL REFERENCES public.events(id),gate_name text,
 requested_quantity integer NOT NULL,admitted_quantity integer NOT NULL CHECK(admitted_quantity>=0),
 remaining_quantity integer NOT NULL CHECK(remaining_quantity>=0),result text NOT NULL CHECK(result IN('VALID','INVALID','ALREADY_USED')),
 scanned_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.group_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_admissions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_admissions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.group_admissions TO authenticated;
CREATE POLICY group_admission_read ON public.group_admissions FOR SELECT TO authenticated USING(
 public.is_admin() OR public.is_venue_owner(venue_id) OR (public.app_role()='staff' AND staff_id=auth.uid()));
CREATE TRIGGER immutable_group_admissions BEFORE UPDATE OR DELETE ON public.group_admissions FOR EACH ROW EXECUTE FUNCTION public.immutable_audit();
CREATE TRIGGER immutable_group_admissions_truncate BEFORE TRUNCATE ON public.group_admissions FOR EACH STATEMENT EXECUTE FUNCTION public.immutable_audit();
ALTER TABLE public.staff_scan_requests ADD COLUMN requested_quantity integer;

-- Preserve the established single-ticket implementation, including the entry
-- window fix. Only definer functions may call this internal admission primitive.
ALTER FUNCTION public.scan_ticket(text,uuid) RENAME TO scan_individual_ticket;
REVOKE ALL ON FUNCTION public.scan_individual_ticket(text,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.group_entry(token text,assignment_id uuid,quantity integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.venue_staff_assignments; g public.group_passes; ord public.orders; evt public.events;
 response jsonb; single_result jsonb; child public.tickets; checked_at timestamptz; starts timestamptz; ends timestamptz;
 outcome text:='GROUP_READY'; message text:='Choose how many guests are entering now.'; admitted integer:=0;
BEGIN
 PERFORM 1 FROM public.users WHERE id=auth.uid() AND role='staff' AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active staff required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.venue_staff_assignments WHERE id=assignment_id AND user_id=auth.uid() AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Assignment required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.venues WHERE id=a.venue_id AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venue unavailable' USING ERRCODE='42501'; END IF;
 -- Serializes ALL admissions for this booking, across staff and request IDs.
 SELECT * INTO g FROM public.group_passes WHERE qr_token=token FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('result','INVALID','message','Group pass not found.'); END IF;
 SELECT * INTO evt FROM public.events WHERE id=g.event_id FOR SHARE;
 IF evt.venue_id IS DISTINCT FROM a.venue_id OR(a.event_id IS NOT NULL AND a.event_id<>evt.id) THEN
  RETURN jsonb_build_object('result','INVALID','message','Pass not valid for this assigned venue, event or gate.'); END IF;
 SELECT * INTO ord FROM public.orders WHERE id=g.order_id FOR SHARE;
 PERFORM 1 FROM public.tickets WHERE order_id=g.order_id ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.tickets WHERE order_id=g.order_id AND (event_id IS DISTINCT FROM evt.id OR(gate_name IS NOT NULL AND a.gate_name IS NOT NULL AND gate_name<>a.gate_name))) THEN
  RETURN jsonb_build_object('result','INVALID','message','Pass not valid for this assigned venue, event or gate.'); END IF;
 checked_at:=clock_timestamp();
 starts:=(evt.date+evt.start_time) AT TIME ZONE 'Asia/Kolkata';
 ends:=(evt.date+evt.end_time+CASE WHEN evt.end_time<=evt.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE 'Asia/Kolkata';
 IF ord.payment_status IS DISTINCT FROM 'PAID' OR ord.quantity<>g.purchased_quantity
 OR (SELECT count(*) FROM public.tickets WHERE order_id=g.order_id)<>g.purchased_quantity
 OR EXISTS(SELECT 1 FROM public.tickets WHERE order_id=g.order_id AND status NOT IN('VALID','USED')) THEN
  outcome:='INVALID';message:='Group pass is not valid and paid for entry.';
 ELSIF g.remaining_quantity=0 THEN outcome:='ALREADY_USED';message:='GROUP PASS FULLY USED';
 ELSIF starts IS NULL OR ends IS NULL THEN outcome:='INVALID';message:='Event entry window unavailable.';
 ELSIF checked_at<starts THEN outcome:='INVALID';message:='EVENT NOT STARTED - NOT VALID YET';
 ELSIF checked_at>=ends THEN outcome:='INVALID';message:='EVENT ENDED';
 ELSIF quantity IS NOT NULL AND (quantity<1 OR quantity>g.remaining_quantity) THEN outcome:='INVALID';message:='Requested quantity exceeds remaining guests or is invalid. Scan again for current availability.';
 ELSIF quantity IS NOT NULL THEN
  -- A subtransaction makes partial loop failure roll back every admission.
  BEGIN
   FOR child IN SELECT * FROM public.tickets WHERE order_id=g.order_id AND status='VALID' ORDER BY id LIMIT quantity LOOP
    single_result:=public.scan_individual_ticket(child.qr_token,assignment_id);
    IF single_result->>'result'<>'VALID' THEN RAISE EXCEPTION 'Admission rejected' USING ERRCODE='P0001'; END IF;
    admitted:=admitted+1;
   END LOOP;
   IF admitted<>quantity THEN RAISE EXCEPTION 'Admission rejected' USING ERRCODE='P0001'; END IF;
   outcome:='VALID';message:='ENTRY APPROVED';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   admitted:=0;outcome:='INVALID';message:=coalesce(single_result->>'message','Group availability changed. Scan again.');
  END;
 END IF;
 SELECT * INTO g FROM public.group_passes WHERE id=g.id;
 IF quantity IS NOT NULL THEN
  INSERT INTO public.group_admissions(group_pass_id,staff_id,assignment_id,venue_id,event_id,gate_name,requested_quantity,admitted_quantity,remaining_quantity,result)
  VALUES(g.id,auth.uid(),a.id,evt.venue_id,evt.id,a.gate_name,quantity,admitted,g.remaining_quantity,outcome);
 END IF;
 response:=jsonb_build_object('result',outcome,'message',message,'admitted_quantity',admitted,
  'group',jsonb_build_object('id',g.id,'purchased_quantity',g.purchased_quantity,'checked_in_quantity',g.checked_in_quantity,'remaining_quantity',g.remaining_quantity),
  'ticket',jsonb_build_object('id',g.id,'customer_name',g.customer_name,'event_name',evt.name,'venue_name',(SELECT name FROM public.venues WHERE id=evt.venue_id),'ticket_type',ord.ticket_type,'status',CASE WHEN g.remaining_quantity=0 THEN 'USED' ELSE 'VALID' END,'scanned_at',CASE WHEN admitted>0 THEN checked_at ELSE NULL END));
 RETURN response;
END $$;
REVOKE ALL ON FUNCTION public.group_entry(text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.scan_ticket(token text,assignment_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF token LIKE 'ars-group-%' THEN RETURN public.group_entry(token,assignment_id,NULL); END IF;
 -- Old guest QR URLs remain viewable by their owner but may not bypass group confirmation.
 IF EXISTS(SELECT 1 FROM public.tickets t JOIN public.group_passes g ON g.order_id=t.order_id WHERE t.qr_token=token OR t.id::text=token) THEN
  PERFORM 1 FROM public.venue_staff_assignments a JOIN public.users u ON u.id=a.user_id WHERE a.id=assignment_id AND a.user_id=auth.uid() AND a.active AND u.active AND u.role='staff';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff assignment required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('result','INVALID','message','Use the booking Group Pass QR from My Pass. No guests admitted.');
 END IF;
 RETURN public.scan_individual_ticket(token,assignment_id);
END $$;
REVOKE ALL ON FUNCTION public.scan_ticket(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scan_ticket(text,uuid) TO authenticated;

CREATE FUNCTION public.check_in_group(token text,assignment_id uuid,request_id uuid,quantity integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.venue_staff_assignments; prior public.staff_scan_requests; fingerprint text; response jsonb;
BEGIN
 PERFORM 1 FROM public.users WHERE id=auth.uid() AND role='staff' AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active staff required' USING ERRCODE='42501'; END IF;
 SELECT va.* INTO a FROM public.venue_staff_assignments va JOIN public.venues v ON v.id=va.venue_id
 WHERE va.id=assignment_id AND va.user_id=auth.uid() AND va.active AND v.active FOR SHARE OF va,v;
 IF NOT FOUND THEN RAISE EXCEPTION 'Assignment unavailable' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR quantity IS NULL OR token IS NULL OR length(token)>200 THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 fingerprint:=encode(sha256(convert_to(trim(token),'UTF8')),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 SELECT * INTO prior FROM public.staff_scan_requests r WHERE r.staff_id=auth.uid() AND r.request_id=check_in_group.request_id;
 IF FOUND THEN
  IF prior.assignment_id<>assignment_id OR prior.token_hash<>fingerprint OR prior.requested_quantity IS DISTINCT FROM quantity THEN RAISE EXCEPTION 'Request ID already used for another scan' USING ERRCODE='22023'; END IF;
  RETURN prior.response||jsonb_build_object('replayed',true);
 END IF;
 response:=public.group_entry(trim(token),assignment_id,quantity)||jsonb_build_object('request_id',request_id,'recorded_at',clock_timestamp(),'replayed',false);
 INSERT INTO public.staff_scan_requests(staff_id,request_id,assignment_id,venue_id,token_hash,response,requested_quantity)
 VALUES(auth.uid(),request_id,a.id,a.venue_id,fingerprint,response,quantity);
 RETURN response;
END $$;
REVOKE ALL ON FUNCTION public.check_in_group(text,uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_in_group(text,uuid,uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
