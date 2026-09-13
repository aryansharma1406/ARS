BEGIN;
CREATE TABLE public.customer_location_preferences (
 customer_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('allowed','denied','skipped','unavailable')),
 latitude numeric(5,2),longitude numeric(6,2),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 notice_version text NOT NULL DEFAULT 'ars-location-v1',
 CHECK((status='allowed' AND latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180) OR (status<>'allowed' AND latitude IS NULL AND longitude IS NULL))
);
ALTER TABLE public.customer_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_location_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_location_preferences FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customer_location_preferences TO authenticated;
CREATE POLICY customer_location_read ON public.customer_location_preferences FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_admin());
CREATE FUNCTION public.record_customer_location(choice text,lat numeric DEFAULT NULL,lng numeric DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501'; END IF;
 IF choice IS NULL OR choice NOT IN ('allowed','denied','skipped','unavailable') THEN RAISE EXCEPTION 'Invalid location choice' USING ERRCODE='22023'; END IF;
 IF choice='allowed' AND (lat IS NULL OR lng IS NULL OR NOT(lat BETWEEN -90 AND 90) OR NOT(lng BETWEEN -180 AND 180)) THEN RAISE EXCEPTION 'Invalid location' USING ERRCODE='22023'; END IF;
 INSERT INTO public.customer_location_preferences(customer_id,status,latitude,longitude)
 VALUES(auth.uid(),choice,CASE WHEN choice='allowed' THEN round(lat,2) END,CASE WHEN choice='allowed' THEN round(lng,2) END)
 ON CONFLICT(customer_id) DO UPDATE SET status=excluded.status,latitude=excluded.latitude,longitude=excluded.longitude,recorded_at=now(),notice_version='ars-location-v1';
END $$;
REVOKE ALL ON FUNCTION public.record_customer_location(text,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_location(text,numeric,numeric) TO authenticated;
COMMIT;
