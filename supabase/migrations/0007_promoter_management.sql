-- Add management metadata without replacing source codes or payment functions.
ALTER TABLE public.sources ADD COLUMN email text;
ALTER TABLE public.sources ADD COLUMN phone text;
ALTER TABLE public.sources ADD COLUMN event_ids uuid[] NOT NULL DEFAULT '{}';
GRANT SELECT (event_ids) ON public.sources TO service_role;

CREATE TABLE public.promoter_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promoter_visits_source ON public.promoter_visits(source_id);
CREATE TABLE public.promoter_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE RESTRICT,
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 reference text NOT NULL,
 paid_at timestamptz NOT NULL DEFAULT now(),
 recorded_by uuid NOT NULL REFERENCES public.users(id)
);
ALTER TABLE public.promoter_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_payouts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.promoter_visits,public.promoter_payouts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.promoter_visits,public.promoter_payouts TO authenticated;
CREATE POLICY admin_visits_read ON public.promoter_visits FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY admin_payouts_read ON public.promoter_payouts FOR SELECT TO authenticated USING(public.is_admin());
ALTER TABLE public.orders ADD COLUMN referral_visit_id uuid REFERENCES public.promoter_visits(id) ON DELETE RESTRICT;
ALTER TABLE public.orders ADD COLUMN promoter_commission_percentage numeric(5,2);
UPDATE public.orders o SET promoter_commission_percentage=s.commission_percentage FROM public.sources s WHERE o.source_code=s.code;
CREATE INDEX orders_referral_visit ON public.orders(referral_visit_id) WHERE referral_visit_id IS NOT NULL;

CREATE FUNCTION public.enforce_promoter_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE src public.sources; event_venue uuid;
BEGIN
 IF NEW.source_code IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO src FROM public.sources WHERE code=NEW.source_code FOR SHARE;
 SELECT venue_id INTO event_venue FROM public.events WHERE id=NEW.event_id;
 IF src.id IS NULL OR NOT src.active OR src.venue_id IS DISTINCT FROM event_venue
  OR (cardinality(src.event_ids)>0 AND NOT NEW.event_id=ANY(src.event_ids)) THEN
  RAISE EXCEPTION 'This referral is not available for this event.' USING ERRCODE='22023';
 END IF;
 NEW.promoter_commission_percentage:=src.commission_percentage;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_promoter_booking() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_promoter_booking BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_promoter_booking();

CREATE FUNCTION public.admin_manage_promoter(payload jsonb,target_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE src public.sources; assigned uuid[]; venue uuid; rate numeric;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 PERFORM public.assert_fields(payload,ARRAY['name','email','phone','code','venue_id','commission_percentage','event_ids','active']);
 IF target_id IS NOT NULL THEN
   SELECT * INTO src FROM public.sources WHERE id=target_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Promoter not found' USING ERRCODE='22023'; END IF;
   IF payload ? 'code' AND upper(btrim(payload->>'code'))<>src.code OR payload ? 'venue_id' AND (payload->>'venue_id')::uuid<>src.venue_id THEN
     RAISE EXCEPTION 'Existing referral codes and venues cannot be changed. Create a new code instead.' USING ERRCODE='22023';
   END IF;
   IF payload= jsonb_build_object('active',payload->'active') THEN
     IF jsonb_typeof(payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE='22023'; END IF;
     UPDATE public.sources SET active=(payload->>'active')::boolean WHERE id=target_id; RETURN;
   END IF;
 END IF;
 venue:=coalesce(src.venue_id,(payload->>'venue_id')::uuid);
 rate:=(payload->>'commission_percentage')::numeric;
 IF coalesce(length(btrim(payload->>'name')),0) NOT BETWEEN 1 AND 150 OR rate IS NULL OR rate NOT BETWEEN 0 AND 100
   OR coalesce(length(payload->>'email'),0)>254 OR coalesce(length(payload->>'phone'),0)>30 THEN
   RAISE EXCEPTION 'Enter valid promoter details and commission from 0 to 100.' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(payload->>'email'),'') IS NOT NULL AND payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
   RAISE EXCEPTION 'Enter a valid promoter email.' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=venue AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Venue unavailable' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(payload->'event_ids') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose valid event assignments' USING ERRCODE='22023'; END IF;
 SELECT coalesce(array_agg(DISTINCT value::uuid),'{}') INTO assigned FROM jsonb_array_elements_text(payload->'event_ids');
 IF EXISTS(SELECT 1 FROM unnest(assigned) id WHERE NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=id AND e.venue_id=venue)) THEN
   RAISE EXCEPTION 'Assigned events must belong to the selected venue.' USING ERRCODE='22023'; END IF;
 IF target_id IS NULL THEN
   IF coalesce(length(btrim(payload->>'code')),0) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Enter a referral code.' USING ERRCODE='22023'; END IF;
   INSERT INTO public.sources(name,email,phone,code,venue_id,commission_percentage,event_ids,active)
   VALUES(btrim(payload->>'name'),nullif(btrim(payload->>'email'),''),nullif(btrim(payload->>'phone'),''),upper(btrim(payload->>'code')),venue,rate,assigned,true);
 ELSE
   UPDATE public.sources SET name=btrim(payload->>'name'),email=nullif(btrim(payload->>'email'),''),phone=nullif(btrim(payload->>'phone'),''),commission_percentage=rate,event_ids=assigned WHERE id=target_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_manage_promoter(jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_promoter(jsonb,uuid) TO authenticated;

CREATE FUNCTION public.register_promoter_visit(referral_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE src public.sources; visit uuid;
BEGIN
 SELECT * INTO src FROM public.sources WHERE code=referral_code AND active;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=src.venue_id AND active) THEN RAISE EXCEPTION 'Referral unavailable' USING ERRCODE='22023'; END IF;
 INSERT INTO public.promoter_visits(source_id) VALUES(src.id) RETURNING id INTO visit;
 RETURN visit;
END $$;
REVOKE ALL ON FUNCTION public.register_promoter_visit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_promoter_visit(text) TO service_role;

CREATE FUNCTION public.reserve_attributed_order(target_customer uuid,target_event uuid,ticket_quantity integer,guest_name text,guest_phone text,referral_code text,discount_code text,expected_total numeric,visit_id uuid DEFAULT NULL)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders;
BEGIN
 ord:=public.reserve_order_with_coupon(target_customer,target_event,ticket_quantity,guest_name,guest_phone,referral_code,discount_code,expected_total);
 IF visit_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.promoter_visits v JOIN public.sources s ON s.id=v.source_id WHERE v.id=visit_id AND s.code=ord.source_code) THEN
   UPDATE public.orders SET referral_visit_id=visit_id WHERE id=ord.id RETURNING * INTO ord;
 END IF;
 RETURN ord;
END $$;
REVOKE ALL ON FUNCTION public.reserve_attributed_order(uuid,uuid,integer,text,text,text,text,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_attributed_order(uuid,uuid,integer,text,text,text,text,numeric,uuid) TO service_role;

CREATE FUNCTION public.admin_promoter_directory() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(summary) ORDER BY summary.created_at DESC),'[]') INTO result FROM (
   SELECT s.*,v.name AS venue_name,
   (SELECT coalesce(sum(quantity),0) FROM public.orders WHERE source_code=s.code AND payment_status='PAID') AS tickets_sold,
   (SELECT coalesce(sum(subtotal),0) FROM public.orders WHERE source_code=s.code AND payment_status='PAID') AS revenue,
   (SELECT count(*) FROM public.tickets t JOIN public.orders o ON o.id=t.order_id WHERE t.source_code=s.code AND t.status='USED' AND o.payment_status='PAID') AS entries,
   (SELECT count(*) FROM public.promoter_visits WHERE source_id=s.id) AS visits,
   (SELECT count(DISTINCT referral_visit_id) FROM public.orders WHERE source_code=s.code AND payment_status='PAID') AS converted_visits,
   (SELECT coalesce(sum(round(g.gross*g.rate/100)),0) FROM (
     SELECT coalesce(o.promoter_commission_percentage,s.commission_percentage) rate,sum(o.subtotal) gross FROM public.orders o
     WHERE o.source_code=s.code AND o.payment_status='PAID' GROUP BY coalesce(o.promoter_commission_percentage,s.commission_percentage)
   ) g) AS earned,
   (SELECT coalesce(sum(amount),0) FROM public.promoter_payouts WHERE source_id=s.id) AS paid
   FROM public.sources s JOIN public.venues v ON v.id=s.venue_id
 ) summary;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_promoter_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_promoter_directory() TO authenticated;
NOTIFY pgrst,'reload schema';
