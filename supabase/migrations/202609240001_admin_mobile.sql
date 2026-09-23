BEGIN;
-- This wrapper registers only the caller's fresh Supabase session. It cannot
-- accept a caller-selected user/session or resurrect a replaced session.
CREATE FUNCTION public.mobile_admin_start() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid:=(auth.jwt()->>'session_id')::uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND active AND role IN ('admin','super_admin'))
 OR NOT EXISTS(SELECT 1 FROM auth.sessions WHERE id=sid AND user_id=auth.uid() AND created_at>clock_timestamp()-interval '2 minutes')
 THEN RAISE EXCEPTION 'Fresh admin login required' USING ERRCODE='42501'; END IF;
 PERFORM public.register_portal_session(auth.uid(),sid,'admin','ARS Admin mobile');
END $$;
CREATE FUNCTION public.mobile_admin_dashboard() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t timestamptz:=statement_timestamp(); day_start timestamptz;
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 day_start:=date_trunc('day',t AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
 RETURN jsonb_build_object(
 'pending',(SELECT count(*) FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id WHERE p.state='PENDING' AND o.payment_status='PENDING' AND o.reservation_expires_at>t),
 'pendingAmount',(SELECT coalesce(sum(o.total),0) FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id WHERE p.state='PENDING' AND o.payment_status='PENDING' AND o.reservation_expires_at>t),
 'approved',(SELECT count(*) FROM public.manual_upi_payments WHERE state='VERIFIED' AND reviewed_at>=day_start AND reviewed_at<=t),
 'rejected',(SELECT count(*) FROM public.manual_upi_payments WHERE state='REJECTED' AND reviewed_at>=day_start AND reviewed_at<=t),
 'tickets',(SELECT count(*) FROM public.tickets WHERE created_at>=day_start AND created_at<=t),'serverTime',t);
END $$;
CREATE TABLE public.admin_push_devices(token text PRIMARY KEY CHECK(length(token)<256),user_id uuid NOT NULL REFERENCES public.users(id),session_id uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.admin_push_jobs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES public.orders(id),token text NOT NULL REFERENCES public.admin_push_devices(token) ON DELETE CASCADE,attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),receipt_id text,sent_at timestamptz,done boolean NOT NULL DEFAULT false,UNIQUE(order_id,token));
ALTER TABLE public.admin_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_push_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_push_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_push_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_push_devices,public.admin_push_jobs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.admin_push_devices,public.admin_push_jobs TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.admin_push_jobs_id_seq TO service_role;
CREATE INDEX admin_push_ready ON public.admin_push_jobs(available_at) WHERE NOT done;
CREATE FUNCTION public.mobile_admin_push(push_token text,enabled boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF push_token IS NULL OR push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' OR length(push_token)>255 THEN RAISE EXCEPTION 'Invalid device token' USING ERRCODE='22023'; END IF;
 IF NOT enabled THEN DELETE FROM public.admin_push_devices WHERE token=push_token AND user_id=auth.uid(); RETURN; END IF;
 INSERT INTO public.admin_push_devices(token,user_id,session_id) VALUES(push_token,auth.uid(),(auth.jwt()->>'session_id')::uuid)
 ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,updated_at=now();
END $$;
CREATE FUNCTION public.enqueue_admin_payment_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.state='PENDING' AND OLD.state IS DISTINCT FROM NEW.state THEN
 INSERT INTO public.admin_push_jobs(order_id,token)
 SELECT NEW.order_id,d.token FROM public.admin_push_devices d JOIN public.users u ON u.id=d.user_id AND u.active AND u.role IN ('admin','super_admin')
 JOIN public.portal_login_sessions s ON s.session_id=d.session_id AND s.user_id=d.user_id AND s.ended_at IS NULL
 JOIN auth.sessions a ON a.id=s.session_id AND a.user_id=u.id ON CONFLICT DO NOTHING;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER admin_pending_push AFTER UPDATE OF state ON public.manual_upi_payments FOR EACH ROW EXECUTE FUNCTION public.enqueue_admin_payment_push();
CREATE FUNCTION public.claim_admin_push() RETURNS SETOF public.admin_push_jobs LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.admin_push_jobs j SET attempts=j.attempts+1,available_at=now()+interval '5 minutes'
 WHERE j.id IN(SELECT q.id FROM public.admin_push_jobs q JOIN public.admin_push_devices d ON d.token=q.token
 JOIN public.users u ON u.id=d.user_id AND u.active AND u.role IN ('admin','super_admin')
 JOIN public.portal_login_sessions s ON s.session_id=d.session_id AND s.user_id=u.id AND s.ended_at IS NULL
 JOIN auth.sessions a ON a.id=s.session_id AND a.user_id=u.id
 JOIN public.manual_upi_payments p ON p.order_id=q.order_id AND p.state='PENDING'
 JOIN public.orders o ON o.id=p.order_id AND o.payment_status='PENDING' AND o.reservation_expires_at>now()
 WHERE NOT q.done AND q.receipt_id IS NULL AND q.attempts<5 AND q.available_at<=now()
 ORDER BY q.id LIMIT 50 FOR UPDATE OF q SKIP LOCKED) RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.mobile_admin_start(),public.mobile_admin_dashboard(),public.mobile_admin_push(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_admin_start(),public.mobile_admin_dashboard(),public.mobile_admin_push(text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.enqueue_admin_payment_push(),public.claim_admin_push() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_push() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
