-- Customer discounts are separate from promoter referral attribution.
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code = upper(btrim(code)) AND length(code) BETWEEN 1 AND 80),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  venue_id uuid REFERENCES public.venues(id) ON DELETE RESTRICT,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percentage' OR discount_value < 100)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.coupons TO authenticated;
CREATE POLICY admin_coupon_read ON public.coupons FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.audit_change();

ALTER TABLE public.orders ADD COLUMN original_subtotal numeric(12,2);
ALTER TABLE public.orders ADD COLUMN discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE public.orders ADD COLUMN coupon_code text;
UPDATE public.orders SET original_subtotal=subtotal WHERE original_subtotal IS NULL;

CREATE FUNCTION public.admin_save_coupon(payload jsonb, target_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF target_id IS NOT NULL THEN
    PERFORM public.assert_fields(payload,ARRAY['active']);
    IF jsonb_typeof(payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid coupon status' USING ERRCODE='22023'; END IF;
    UPDATE public.coupons SET active=(payload->>'active')::boolean WHERE id=target_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found' USING ERRCODE='22023'; END IF;
  ELSE
    PERFORM public.assert_fields(payload,ARRAY['code','discount_type','discount_value','venue_id','expires_at']);
    INSERT INTO public.coupons(code,discount_type,discount_value,venue_id,expires_at)
    VALUES(upper(btrim(payload->>'code')),payload->>'discount_type',(payload->>'discount_value')::numeric,
      nullif(payload->>'venue_id','')::uuid,nullif(payload->>'expires_at','')::timestamptz);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_save_coupon(jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_coupon(jsonb,uuid) TO authenticated;

-- Private calculation shared by preview and reservation. Uses database prices only.
CREATE FUNCTION public.calculate_checkout_quote(target_event uuid, ticket_quantity integer, discount_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE evt public.events; coupon public.coupons; original numeric; discount numeric:=0; net numeric; fee numeric; normalized text;
BEGIN
  IF ticket_quantity IS NULL OR ticket_quantity NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Choose between 1 and 10 tickets.' USING ERRCODE='22023'; END IF;
  SELECT * INTO evt FROM public.events WHERE id=target_event AND published;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=evt.venue_id AND active) THEN RAISE EXCEPTION 'Event unavailable' USING ERRCODE='22023'; END IF;
  original:=round(evt.ticket_price*ticket_quantity,2);
  normalized:=nullif(upper(btrim(discount_code)),'');
  IF normalized IS NOT NULL THEN
    SELECT * INTO coupon FROM public.coupons WHERE code=normalized AND active
      AND (venue_id IS NULL OR venue_id=evt.venue_id) AND (expires_at IS NULL OR expires_at>now()) FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Coupon: invalid, expired, or not available for this venue.' USING ERRCODE='22023'; END IF;
    discount:=CASE WHEN coupon.discount_type='percentage' THEN round(original*coupon.discount_value/100,2) ELSE coupon.discount_value END;
    IF original-discount<1 THEN RAISE EXCEPTION 'Coupon: the discounted ticket subtotal must be at least INR 1.' USING ERRCODE='22023'; END IF;
  END IF;
  net:=original-discount;
  fee:=round(net*0.03);
  RETURN jsonb_build_object('originalSubtotal',original,'discount',discount,'subtotal',net,'fees',fee,'total',net+fee,'couponCode',normalized);
END $$;
REVOKE ALL ON FUNCTION public.calculate_checkout_quote(uuid,integer,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.checkout_coupon_quote(target_event uuid, ticket_quantity integer, discount_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
  RETURN public.calculate_checkout_quote(target_event,ticket_quantity,discount_code);
END $$;
REVOKE ALL ON FUNCTION public.checkout_coupon_quote(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.checkout_coupon_quote(uuid,integer,text) TO authenticated;

CREATE FUNCTION public.reserve_order_with_coupon(target_customer uuid,target_event uuid,ticket_quantity integer,guest_name text,guest_phone text,referral_code text,discount_code text,expected_total numeric)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ord public.orders; quote jsonb;
BEGIN
  -- Existing reservation enforces customer, venue, capacity, referral and pending-order checks.
  ord:=public.reserve_order(target_customer,target_event,ticket_quantity,guest_name,guest_phone,referral_code);
  quote:=public.calculate_checkout_quote(target_event,ticket_quantity,discount_code);
  IF expected_total IS NULL OR expected_total<>(quote->>'total')::numeric THEN
    RAISE EXCEPTION 'Checkout total changed. Refresh checkout and apply your coupon again.' USING ERRCODE='22023';
  END IF;
  UPDATE public.orders SET original_subtotal=(quote->>'originalSubtotal')::numeric,
    discount_amount=(quote->>'discount')::numeric,coupon_code=quote->>'couponCode',
    subtotal=(quote->>'subtotal')::numeric,fees=(quote->>'fees')::numeric,total=(quote->>'total')::numeric
    WHERE id=ord.id RETURNING * INTO ord;
  -- Existing promoter/settlement reports sum subtotal, which is now the discounted amount.
  RETURN ord;
END $$;
REVOKE ALL ON FUNCTION public.reserve_order_with_coupon(uuid,uuid,integer,text,text,text,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_with_coupon(uuid,uuid,integer,text,text,text,text,numeric) TO service_role;
NOTIFY pgrst,'reload schema';
