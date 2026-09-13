-- Additive marketing data only; transactional tables/functions and their RLS are unchanged.
BEGIN;
CREATE TABLE public.customer_marketing_preferences (
 customer_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 city text NOT NULL DEFAULT '' CHECK(length(city)<=100),
 phone text NOT NULL DEFAULT '' CHECK(phone='' OR phone ~ '^\+[1-9][0-9]{7,14}$'),
 email text NOT NULL DEFAULT '',
 whatsapp boolean NOT NULL DEFAULT false,
 email_marketing boolean NOT NULL DEFAULT false,
 sms boolean NOT NULL DEFAULT false,
 notice_version text NOT NULL DEFAULT 'ars-marketing-v1',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customer_marketing_consent_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 preferences jsonb NOT NULL,notice_version text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.marketing_audiences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
 filters jsonb NOT NULL CHECK(jsonb_typeof(filters)='object'),created_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.marketing_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
 audience_id uuid NOT NULL REFERENCES public.marketing_audiences(id),
 channel text NOT NULL CHECK(channel IN ('whatsapp','email','sms')),
 subject text NOT NULL DEFAULT '' CHECK(length(subject)<=200),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','paused','completed','cancelled')),
 created_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.marketing_delivery_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id),
 customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 event text NOT NULL CHECK(event IN ('sent','delivered','read','clicked','failed','unsubscribed')),
 provider_event_id text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(campaign_id,customer_id,event)
);
ALTER TABLE public.customer_marketing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_marketing_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customer_marketing_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_marketing_consent_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_marketing_preferences,public.customer_marketing_consent_log,public.marketing_audiences,public.marketing_campaigns,public.marketing_delivery_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customer_marketing_preferences,public.customer_marketing_consent_log,public.marketing_audiences,public.marketing_campaigns,public.marketing_delivery_events TO authenticated;
GRANT INSERT ON public.marketing_audiences,public.marketing_campaigns TO authenticated;
CREATE POLICY read_preferences ON public.customer_marketing_preferences FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_admin());
CREATE POLICY read_consent_log ON public.customer_marketing_consent_log FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_admin());
CREATE POLICY read_audiences ON public.marketing_audiences FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY create_audiences ON public.marketing_audiences FOR INSERT TO authenticated WITH CHECK(public.is_admin() AND created_by=auth.uid());
CREATE POLICY read_campaigns ON public.marketing_campaigns FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY create_campaigns ON public.marketing_campaigns FOR INSERT TO authenticated WITH CHECK(public.is_admin() AND created_by=auth.uid() AND status='draft');
CREATE POLICY read_delivery ON public.marketing_delivery_events FOR SELECT TO authenticated USING(public.is_admin());
-- Delivery writes are reserved for a future verified server-side provider adapter.
GRANT SELECT,INSERT ON public.marketing_delivery_events TO service_role;
CREATE FUNCTION public.save_customer_marketing(city_value text,phone_value text,whatsapp_value boolean,email_value boolean,sms_value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account_email text; snapshot jsonb;
BEGIN
 IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 IF length(coalesce(city_value,''))>100 OR (coalesce(phone_value,'')<>'' AND phone_value !~ '^\+[1-9][0-9]{7,14}$') THEN RAISE EXCEPTION 'Enter a valid city and international phone number.' USING ERRCODE='22023'; END IF;
 IF (whatsapp_value OR sms_value) AND coalesce(phone_value,'')='' THEN RAISE EXCEPTION 'A phone number is required for WhatsApp or SMS opt-in.' USING ERRCODE='22023'; END IF;
 SELECT email INTO account_email FROM public.users WHERE id=auth.uid();
 INSERT INTO public.customer_marketing_preferences(customer_id,city,phone,email,whatsapp,email_marketing,sms)
 VALUES(auth.uid(),btrim(coalesce(city_value,'')),coalesce(phone_value,''),account_email,coalesce(whatsapp_value,false),coalesce(email_value,false),coalesce(sms_value,false))
 ON CONFLICT(customer_id) DO UPDATE SET city=excluded.city,phone=excluded.phone,email=excluded.email,whatsapp=excluded.whatsapp,email_marketing=excluded.email_marketing,sms=excluded.sms,notice_version='ars-marketing-v1',updated_at=now();
 SELECT to_jsonb(p) INTO snapshot FROM public.customer_marketing_preferences p WHERE customer_id=auth.uid();
 INSERT INTO public.customer_marketing_consent_log(customer_id,preferences,notice_version) VALUES(auth.uid(),snapshot,'ars-marketing-v1');
END $$;
REVOKE ALL ON FUNCTION public.save_customer_marketing(text,text,boolean,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_customer_marketing(text,text,boolean,boolean,boolean) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
