-- Public visitors must not evaluate portal assignment policies.
-- Keep existing authenticated policies and all private table permissions intact.
BEGIN;
DROP POLICY IF EXISTS anonymous_active_venues ON public.venues;
DROP POLICY IF EXISTS anonymous_published_events ON public.events;
-- Existing projects may contain additional legacy policies assigned to PUBLIC.
-- PostgreSQL can evaluate these even when another public policy allows the row.
-- Preserve their expressions and named roles, but exclude anonymous visitors.
DO $$
DECLARE policy_row record; scoped_roles text;
BEGIN
 FOR policy_row IN
   SELECT tablename,policyname,roles FROM pg_policies
   WHERE schemaname='public' AND tablename IN ('venues','events')
     AND ('anon'=ANY(roles) OR 'public'=ANY(roles))
 LOOP
   SELECT string_agg(quote_ident(role_name),', ') INTO scoped_roles
   FROM (
     SELECT DISTINCT CASE WHEN role_value::text IN ('anon','public')
       THEN 'authenticated' ELSE role_value::text END AS role_name
     FROM unnest(policy_row.roles) AS role_value
   ) AS role_list;
   EXECUTE format('ALTER POLICY %I ON public.%I TO %s',
     policy_row.policyname,policy_row.tablename,scoped_roles);
 END LOOP;
END $$;
CREATE POLICY anonymous_active_venues ON public.venues FOR SELECT TO anon
 USING (active = true);
CREATE POLICY anonymous_published_events ON public.events FOR SELECT TO anon
 USING (published = true AND EXISTS (
   SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.active = true
 ));
GRANT SELECT(id,name,location,address,description,image,active,created_at) ON public.venues TO anon;
GRANT SELECT(id,venue_id,name,description,image,category,date,start_time,end_time,ticket_price,ticket_capacity,tickets_sold,age_limit,published,created_at) ON public.events TO anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
