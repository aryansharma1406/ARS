BEGIN;

-- Session IDs are Supabase-issued identifiers, never credentials or browser input.
CREATE TABLE public.portal_login_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 session_id uuid NOT NULL UNIQUE,
 account_name text NOT NULL,
 account_email text NOT NULL DEFAULT '',
 account_role text NOT NULL CHECK(account_role IN ('venue_owner','admin','super_admin')),
 portal text NOT NULL CHECK(portal IN ('owner','admin')),
 user_agent text NOT NULL DEFAULT '' CHECK(length(user_agent)<=512),
 auth_created_at timestamptz NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 end_reason text CHECK(end_reason IN ('replaced','signed_out')),
 CHECK((ended_at IS NULL)=(end_reason IS NULL))
);
CREATE UNIQUE INDEX portal_one_session_per_account ON public.portal_login_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX portal_login_history ON public.portal_login_sessions(user_id,started_at DESC);
ALTER TABLE public.portal_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_login_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_login_sessions FROM PUBLIC,anon,authenticated;
-- No browser writes or raw session-ID reads. History is returned by a scoped RPC.

CREATE FUNCTION public.portal_session_valid() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN u.role IN ('venue_owner','admin','super_admin') THEN EXISTS(
   SELECT 1 FROM public.portal_login_sessions p
   JOIN auth.sessions s ON s.id=p.session_id AND s.user_id=p.user_id
   WHERE p.user_id=u.id AND p.ended_at IS NULL
     AND p.session_id::text=auth.jwt()->>'session_id'
 ) ELSE true END
 FROM public.users u WHERE u.id=auth.uid() AND u.active;
$$;
REVOKE ALL ON FUNCTION public.portal_session_valid() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_session_valid() TO authenticated;

-- Keep role/tenant rules intact while making a superseded business JWT powerless.
-- A non-role sentinel also rejects legacy functions using <> rather than IS DISTINCT FROM.
CREATE OR REPLACE FUNCTION public.app_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN u.role IN ('venue_owner','admin','super_admin')
   AND NOT coalesce(public.portal_session_valid(),false) THEN 'session_revoked'
   ELSE u.role END
 FROM public.users u WHERE u.id=auth.uid() AND u.active;
$$;

CREATE FUNCTION public.register_portal_session(target_user uuid,target_session uuid,target_portal text,agent text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE person public.users; issued timestamptz; previous public.portal_login_sessions;
BEGIN
 -- Executable only by the backend after successful password verification.
 SELECT * INTO person FROM public.users WHERE id=target_user AND active FOR UPDATE;
 IF NOT FOUND OR NOT ((target_portal='owner' AND person.role='venue_owner') OR
   (target_portal='admin' AND person.role IN ('admin','super_admin'))) THEN
   RAISE EXCEPTION 'Portal account required' USING ERRCODE='42501';
 END IF;
 SELECT s.created_at INTO issued FROM auth.sessions s WHERE s.id=target_session AND s.user_id=target_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
 -- An old/replayed registration may never take the active slot back.
 IF EXISTS(SELECT 1 FROM public.portal_login_sessions WHERE session_id=target_session) THEN
   IF EXISTS(SELECT 1 FROM public.portal_login_sessions WHERE session_id=target_session AND ended_at IS NULL) THEN RETURN; END IF;
   RAISE EXCEPTION 'Session already ended' USING ERRCODE='42501';
 END IF;
 SELECT * INTO previous FROM public.portal_login_sessions WHERE user_id=target_user ORDER BY auth_created_at DESC,session_id DESC LIMIT 1;
 IF FOUND AND (previous.auth_created_at,previous.session_id)>(issued,target_session) THEN
   RAISE EXCEPTION 'A newer login already exists' USING ERRCODE='42501';
 END IF;
 UPDATE public.portal_login_sessions SET ended_at=now(),end_reason='replaced' WHERE user_id=target_user AND ended_at IS NULL;
 INSERT INTO public.portal_login_sessions(user_id,session_id,account_name,account_email,account_role,portal,user_agent,auth_created_at)
 VALUES(target_user,target_session,coalesce(person.name,''),coalesce(person.email,''),person.role,target_portal,left(coalesce(agent,''),512),issued);
END $$;
REVOKE ALL ON FUNCTION public.register_portal_session(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_portal_session(uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.touch_portal_session() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(public.portal_session_valid(),false) THEN RETURN false; END IF;
 UPDATE public.portal_login_sessions SET last_seen_at=now()
 WHERE user_id=auth.uid() AND session_id::text=auth.jwt()->>'session_id'
   AND ended_at IS NULL AND last_seen_at<now()-interval '1 minute';
 RETURN true;
END $$;
CREATE FUNCTION public.end_portal_session() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Signing out an old device never ends the new device's session.
 UPDATE public.portal_login_sessions SET ended_at=now(),end_reason='signed_out'
 WHERE user_id=auth.uid() AND session_id::text=auth.jwt()->>'session_id' AND ended_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.touch_portal_session(),public.end_portal_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.touch_portal_session(),public.end_portal_session() TO authenticated;

CREATE FUNCTION public.portal_login_activity(row_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.app_role() NOT IN ('venue_owner','admin','super_admin') OR public.app_role() IS NULL THEN
   RAISE EXCEPTION 'Business session required' USING ERRCODE='42501';
 END IF;
 IF row_offset<0 OR row_offset>1000000 THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(history)) FROM (
   SELECT p.id,p.account_name,p.account_email,p.account_role,p.portal,p.user_agent,p.started_at,p.last_seen_at,p.ended_at,
     CASE WHEN p.ended_at IS NOT NULL THEN p.end_reason
       WHEN NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p.session_id AND s.user_id=p.user_id) THEN 'expired'
       ELSE 'active' END AS status,
     p.session_id::text=auth.jwt()->>'session_id' AS current_session
   FROM public.portal_login_sessions p WHERE public.is_admin() OR p.user_id=auth.uid()
   ORDER BY p.started_at DESC,p.id DESC LIMIT 101 OFFSET row_offset
 ) history),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.portal_login_activity(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.portal_login_activity(integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
