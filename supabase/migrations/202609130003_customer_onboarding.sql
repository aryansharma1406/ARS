BEGIN;
-- Additive only: no existing customer, booking, payment, or access records change.
CREATE TABLE public.customer_onboarding (
 customer_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 area text NOT NULL DEFAULT '' CHECK(length(area)<=120),
 completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_onboarding FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_onboarding FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customer_onboarding TO authenticated;
CREATE POLICY customer_onboarding_read ON public.customer_onboarding FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_admin());
CREATE OR REPLACE FUNCTION public.complete_customer_onboarding(customer_name text, selected_area text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501'; END IF;
 IF customer_name IS NULL OR length(btrim(customer_name)) NOT BETWEEN 1 AND 120 OR selected_area IS NULL OR length(selected_area)>120 THEN RAISE EXCEPTION 'Enter a name of up to 120 characters and a valid area' USING ERRCODE='22023'; END IF;
 UPDATE public.users SET name=btrim(customer_name) WHERE id=auth.uid() AND role='customer';
 INSERT INTO public.customer_onboarding(customer_id,area) VALUES(auth.uid(),btrim(selected_area)) ON CONFLICT(customer_id) DO UPDATE SET area=excluded.area;
END $$;
REVOKE ALL ON FUNCTION public.complete_customer_onboarding(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_customer_onboarding(text,text) TO authenticated;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS latitude double precision CHECK(latitude BETWEEN -90 AND 90);
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS longitude double precision CHECK(longitude BETWEEN -180 AND 180);
-- Public discovery fields only; never return owner or staff details.
CREATE OR REPLACE FUNCTION public.discovery_venue_locations() RETURNS TABLE(id uuid,name text,location text,latitude double precision,longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT v.id,v.name,v.location,v.latitude,v.longitude FROM public.venues v WHERE v.active=true ORDER BY v.name;
$$;
REVOKE ALL ON FUNCTION public.discovery_venue_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discovery_venue_locations() TO anon,authenticated;
COMMIT;
