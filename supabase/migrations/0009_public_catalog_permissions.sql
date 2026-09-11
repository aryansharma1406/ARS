-- Public visitors must not evaluate portal assignment policies.
-- Keep existing authenticated policies and all private table permissions intact.
BEGIN;
ALTER POLICY venues_read ON public.venues TO authenticated;
ALTER POLICY events_read ON public.events TO authenticated;
DROP POLICY IF EXISTS anonymous_active_venues ON public.venues;
CREATE POLICY anonymous_active_venues ON public.venues FOR SELECT TO anon
 USING (active = true);
DROP POLICY IF EXISTS anonymous_published_events ON public.events;
CREATE POLICY anonymous_published_events ON public.events FOR SELECT TO anon
 USING (published = true AND EXISTS (
   SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.active = true
 ));
GRANT SELECT(id,name,location,address,description,image,active,created_at) ON public.venues TO anon;
GRANT SELECT(id,venue_id,name,description,image,category,date,start_time,end_time,ticket_price,ticket_capacity,tickets_sold,age_limit,published,created_at) ON public.events TO anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
