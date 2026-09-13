BEGIN;
CREATE TABLE public.event_pass_tiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),price numeric(12,2) NOT NULL CHECK(price>0),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=4000),benefits text[] NOT NULL DEFAULT '{}',
 capacity integer NOT NULL CHECK(capacity>=0),sale_start timestamptz,sale_end timestamptz,active boolean NOT NULL DEFAULT true,
 is_default boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(sale_end IS NULL OR sale_start IS NULL OR sale_end>sale_start)
);
CREATE UNIQUE INDEX event_default_pass ON public.event_pass_tiers(event_id) WHERE is_default;
ALTER TABLE public.event_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pass_tiers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_pass_tiers FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.event_pass_tiers TO authenticated;
CREATE POLICY manage_tier_read ON public.event_pass_tiers FOR SELECT TO authenticated USING(public.is_admin() OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND public.is_venue_owner(e.venue_id)));
ALTER TABLE public.orders ADD COLUMN ticket_tier_id uuid REFERENCES public.event_pass_tiers(id) ON DELETE RESTRICT;
ALTER TABLE public.orders ADD COLUMN tier_unit_price numeric(12,2);
ALTER TABLE public.orders ADD COLUMN tier_description text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN tier_benefits text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tickets ADD COLUMN ticket_tier_id uuid REFERENCES public.event_pass_tiers(id) ON DELETE RESTRICT;
ALTER TABLE public.tickets ADD COLUMN tier_unit_price numeric(12,2);
ALTER TABLE public.tickets ADD COLUMN tier_description text NOT NULL DEFAULT '';
ALTER TABLE public.tickets ADD COLUMN tier_benefits text[] NOT NULL DEFAULT '{}';
CREATE INDEX orders_tier_capacity ON public.orders(ticket_tier_id,payment_status,reservation_expires_at);
INSERT INTO public.event_pass_tiers(event_id,name,price,capacity,is_default) SELECT id,'General VIP Entry',ticket_price,ticket_capacity,true FROM public.events;
UPDATE public.orders o SET ticket_tier_id=t.id,tier_unit_price=round(coalesce(o.original_subtotal,o.subtotal)/nullif(o.quantity,0),2) FROM public.event_pass_tiers t WHERE t.event_id=o.event_id AND t.is_default;
UPDATE public.tickets t SET ticket_tier_id=o.ticket_tier_id,tier_unit_price=o.tier_unit_price FROM public.orders o WHERE o.id=t.order_id;
CREATE FUNCTION public.create_default_event_tier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN INSERT INTO public.event_pass_tiers(event_id,name,price,capacity,is_default) VALUES(NEW.id,'General VIP Entry',NEW.ticket_price,NEW.ticket_capacity,true);RETURN NEW;END $$;
CREATE TRIGGER create_default_event_tier AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.create_default_event_tier();

CREATE FUNCTION public.event_tier_availability(target_event uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE evt public.events; holds bigint; result jsonb; closing timestamptz;
BEGIN
 SELECT * INTO evt FROM public.events WHERE id=target_event;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=evt.venue_id AND active) OR (NOT evt.published AND NOT public.is_admin() AND NOT public.is_venue_owner(evt.venue_id)) THEN RETURN '[]'::jsonb; END IF;
 closing:=((evt.date+evt.end_time)+CASE WHEN evt.end_time<=evt.start_time THEN interval '1 day' ELSE interval '0 days' END) AT TIME ZONE 'Asia/Kolkata';
 SELECT coalesce(sum(quantity),0) INTO holds FROM public.orders WHERE event_id=evt.id AND payment_status='PENDING' AND reservation_expires_at>now();
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.price,x.name),'[]'::jsonb) INTO result FROM (
 SELECT t.*,greatest(0,least(t.capacity-coalesce(s.sold,0)-coalesce(s.held,0),evt.ticket_capacity-evt.tickets_sold-holds)) AS available,
 coalesce(s.sold,0) AS sold,coalesce(s.held,0) AS reserved,
 t.active AND evt.published AND now()<closing AND (t.sale_start IS NULL OR now()>=t.sale_start) AND (t.sale_end IS NULL OR now()<t.sale_end) AS on_sale
 FROM public.event_pass_tiers t LEFT JOIN LATERAL(SELECT sum(quantity) FILTER(WHERE payment_status IN ('PAID','REFUNDED')) AS sold,sum(quantity) FILTER(WHERE payment_status='PENDING' AND reservation_expires_at>now()) AS held FROM public.orders WHERE ticket_tier_id=t.id) s ON true
 WHERE t.event_id=evt.id AND (t.active OR public.is_admin() OR public.is_venue_owner(evt.venue_id))
 ) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.event_tier_availability(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_tier_availability(uuid) TO anon,authenticated;

CREATE FUNCTION public.save_event_with_tiers(payload jsonb,target_id uuid DEFAULT NULL,target_venue uuid DEFAULT NULL) RETURNS public.events LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE evt public.events; item jsonb; tier public.event_pass_tiers; wanted uuid; seen uuid[]:='{}'; qty bigint; total_capacity bigint; minimum_price numeric; items jsonb; first_item boolean:=true;
BEGIN
 items:=payload->'tiers';
 IF items IS NULL THEN RETURN public.save_event(payload,target_id,target_venue); END IF;
 IF jsonb_typeof(items)<>'array' OR jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Add at least one pass tier.' USING ERRCODE='22023'; END IF;
 SELECT sum((v->>'capacity')::integer),min((v->>'price')::numeric) INTO total_capacity,minimum_price FROM jsonb_array_elements(items) v;
 evt:=public.save_event((payload-'tiers')||jsonb_build_object('ticket_capacity',total_capacity,'ticket_price',minimum_price),target_id,target_venue);
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  PERFORM public.assert_fields(item,ARRAY['id','name','price','description','benefits','capacity','sale_start','sale_end','active']);
  wanted:=nullif(item->>'id','')::uuid;
  IF target_id IS NULL AND first_item THEN SELECT id INTO wanted FROM public.event_pass_tiers WHERE event_id=evt.id AND is_default; END IF;
  first_item:=false;
  IF wanted IS NOT NULL THEN
   SELECT * INTO tier FROM public.event_pass_tiers WHERE id=wanted AND event_id=evt.id FOR UPDATE;
   IF NOT FOUND OR wanted=ANY(seen) THEN RAISE EXCEPTION 'Invalid pass tier.' USING ERRCODE='22023';END IF;
   SELECT coalesce(sum(quantity),0) INTO qty FROM public.orders WHERE ticket_tier_id=wanted AND (payment_status IN ('PAID','REFUNDED') OR(payment_status='PENDING' AND reservation_expires_at>now()));
   IF (item->>'capacity')::integer<qty THEN RAISE EXCEPTION 'Tier capacity cannot be below sold and reserved passes.' USING ERRCODE='22023'; END IF;
   UPDATE public.event_pass_tiers SET name=btrim(item->>'name'),price=(item->>'price')::numeric,description=coalesce(item->>'description',''),benefits=ARRAY(SELECT jsonb_array_elements_text(coalesce(item->'benefits','[]'::jsonb))),capacity=(item->>'capacity')::integer,sale_start=nullif(item->>'sale_start','')::timestamptz,sale_end=nullif(item->>'sale_end','')::timestamptz,active=(item->>'active')::boolean WHERE id=wanted;
  ELSE
   INSERT INTO public.event_pass_tiers(event_id,name,price,description,benefits,capacity,sale_start,sale_end,active) VALUES(evt.id,btrim(item->>'name'),(item->>'price')::numeric,coalesce(item->>'description',''),ARRAY(SELECT jsonb_array_elements_text(coalesce(item->'benefits','[]'::jsonb))),(item->>'capacity')::integer,nullif(item->>'sale_start','')::timestamptz,nullif(item->>'sale_end','')::timestamptz,(item->>'active')::boolean) RETURNING id INTO wanted;
  END IF;
  seen:=array_append(seen,wanted);
 END LOOP;
 -- Omitted tiers are disabled, never deleted. Retain capacity for their historical sales.
 UPDATE public.event_pass_tiers SET active=false WHERE event_id=evt.id AND NOT(id=ANY(seen));
 SELECT sum(capacity),coalesce(min(price) FILTER(WHERE active),min(price)) INTO total_capacity,minimum_price FROM public.event_pass_tiers WHERE event_id=evt.id;
 UPDATE public.events SET ticket_capacity=total_capacity,ticket_price=minimum_price WHERE id=evt.id RETURNING * INTO evt;
 RETURN evt;
END $$;
REVOKE ALL ON FUNCTION public.save_event_with_tiers(jsonb,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_event_with_tiers(jsonb,uuid,uuid) TO authenticated;

-- Keep the existing discount and fee arithmetic; choose the price from the selected persisted tier.
CREATE OR REPLACE FUNCTION public.calculate_checkout_quote(target_event uuid,ticket_quantity integer,discount_code text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE evt public.events; coupon public.coupons; original numeric; discount numeric:=0; net numeric; fee numeric; normalized text; selected uuid; unit_price numeric;
BEGIN
 IF ticket_quantity IS NULL OR ticket_quantity NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Choose between 1 and 10 tickets.' USING ERRCODE='22023'; END IF;
 SELECT * INTO evt FROM public.events WHERE id=target_event AND published;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=evt.venue_id AND active) THEN RAISE EXCEPTION 'Event unavailable' USING ERRCODE='22023';END IF;
 selected:=nullif(current_setting('ars.ticket_tier',true),'')::uuid;
 SELECT price INTO unit_price FROM public.event_pass_tiers WHERE event_id=evt.id AND (id=selected OR(selected IS NULL AND is_default));
 IF unit_price IS NULL THEN RAISE EXCEPTION 'Pass tier unavailable' USING ERRCODE='22023'; END IF;
 original:=round(unit_price*ticket_quantity,2);normalized:=nullif(upper(btrim(discount_code)),'');
 IF normalized IS NOT NULL THEN
  SELECT * INTO coupon FROM public.coupons WHERE code=normalized AND active AND(venue_id IS NULL OR venue_id=evt.venue_id)AND(expires_at IS NULL OR expires_at>now()) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon: invalid, expired, or not available for this venue.' USING ERRCODE='22023';END IF;
  discount:=CASE WHEN coupon.discount_type='percentage' THEN round(original*coupon.discount_value/100,2) ELSE coupon.discount_value END;
  IF original-discount<1 THEN RAISE EXCEPTION 'Coupon: the discounted ticket subtotal must be at least INR 1.' USING ERRCODE='22023';END IF;
 END IF;
 net:=original-discount;fee:=round(net*0.03);
 RETURN jsonb_build_object('originalSubtotal',original,'discount',discount,'subtotal',net,'fees',fee,'total',net+fee,'couponCode',normalized);
END $$;
CREATE FUNCTION public.checkout_tier_quote(target_event uuid,target_tier uuid,ticket_quantity integer,discount_code text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.event_tier_availability(target_event)) t WHERE (t->>'id')::uuid=target_tier AND(t->>'on_sale')::boolean AND(t->>'available')::integer>=ticket_quantity) THEN RAISE EXCEPTION 'Selected pass is not on sale or has insufficient availability.' USING ERRCODE='22023';END IF;
 PERFORM set_config('ars.ticket_tier',target_tier::text,true);
 result:=public.calculate_checkout_quote(target_event,ticket_quantity,discount_code);
 PERFORM set_config('ars.ticket_tier','',true);RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.checkout_tier_quote(uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.checkout_tier_quote(uuid,uuid,integer,text) TO authenticated;

CREATE FUNCTION public.snapshot_order_tier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tier public.event_pass_tiers; evt public.events; occupied bigint; selected uuid; closing timestamptz;
BEGIN
 IF TG_OP='INSERT' THEN
  selected:=nullif(current_setting('ars.ticket_tier',true),'')::uuid;
  SELECT * INTO tier FROM public.event_pass_tiers WHERE event_id=NEW.event_id AND(id=selected OR(selected IS NULL AND is_default)) FOR UPDATE;
  IF NOT FOUND OR NOT tier.active OR(tier.sale_start IS NOT NULL AND now()<tier.sale_start)OR(tier.sale_end IS NOT NULL AND now()>=tier.sale_end)THEN RAISE EXCEPTION 'Selected pass is not on sale.' USING ERRCODE='22023';END IF;
  SELECT * INTO evt FROM public.events WHERE id=NEW.event_id;
  closing:=((evt.date+evt.end_time)+CASE WHEN evt.end_time<=evt.start_time THEN interval '1 day' ELSE interval '0 days' END) AT TIME ZONE 'Asia/Kolkata';
  IF now()>=closing THEN RAISE EXCEPTION 'Event has ended.' USING ERRCODE='22023';END IF;
  SELECT coalesce(sum(quantity),0) INTO occupied FROM public.orders WHERE ticket_tier_id=tier.id AND(payment_status IN ('PAID','REFUNDED')OR(payment_status='PENDING'AND reservation_expires_at>now()));
  IF occupied+NEW.quantity>tier.capacity THEN RAISE EXCEPTION 'Selected pass capacity exceeded.' USING ERRCODE='22023';END IF;
  NEW.ticket_tier_id:=tier.id;NEW.ticket_type:=tier.name;NEW.tier_unit_price:=tier.price;NEW.tier_description:=tier.description;NEW.tier_benefits:=tier.benefits;
 ELSE
  IF ROW(NEW.ticket_tier_id,NEW.ticket_type,NEW.tier_unit_price,NEW.tier_description,NEW.tier_benefits) IS DISTINCT FROM ROW(OLD.ticket_tier_id,OLD.ticket_type,OLD.tier_unit_price,OLD.tier_description,OLD.tier_benefits) THEN RAISE EXCEPTION 'Purchased tier details are immutable' USING ERRCODE='42501';END IF;
  IF NEW.payment_status='PAID' AND OLD.payment_status<>'PAID' AND NEW.ticket_tier_id IS NOT NULL THEN
   SELECT * INTO tier FROM public.event_pass_tiers WHERE id=NEW.ticket_tier_id FOR UPDATE;
   SELECT coalesce(sum(quantity),0) INTO occupied FROM public.orders WHERE ticket_tier_id=tier.id AND payment_status IN ('PAID','REFUNDED') AND id<>NEW.id;
   IF occupied+NEW.quantity>tier.capacity THEN RAISE EXCEPTION 'Tier capacity unavailable; payment needs reconciliation' USING ERRCODE='22023';END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_order_tier BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_tier();
CREATE FUNCTION public.snapshot_ticket_tier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders;
BEGIN
 SELECT * INTO ord FROM public.orders WHERE id=NEW.order_id;
 NEW.ticket_tier_id:=ord.ticket_tier_id;NEW.ticket_type:=ord.ticket_type;NEW.tier_unit_price:=ord.tier_unit_price;NEW.tier_description:=ord.tier_description;NEW.tier_benefits:=ord.tier_benefits;RETURN NEW;
END $$;
CREATE TRIGGER snapshot_ticket_tier BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.snapshot_ticket_tier();
CREATE FUNCTION public.reserve_tier_order(target_customer uuid,target_event uuid,target_tier uuid,ticket_quantity integer,guest_name text,guest_phone text,referral_code text,discount_code text,expected_total numeric,visit_id uuid DEFAULT NULL) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders;
BEGIN
 IF target_tier IS NULL THEN RAISE EXCEPTION 'Choose a pass tier.' USING ERRCODE='22023'; END IF;
 PERFORM set_config('ars.ticket_tier',target_tier::text,true);
 ord:=public.reserve_attributed_order(target_customer,target_event,ticket_quantity,guest_name,guest_phone,referral_code,discount_code,expected_total,visit_id);
 PERFORM set_config('ars.ticket_tier','',true);RETURN ord;
END $$;
REVOKE ALL ON FUNCTION public.reserve_tier_order(uuid,uuid,uuid,integer,text,text,text,text,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_tier_order(uuid,uuid,uuid,integer,text,text,text,text,numeric,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.create_default_event_tier(),public.snapshot_order_tier(),public.snapshot_ticket_tier() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
