-- Apply after 0007. Invitations grant only scanner access, after email verification.
CREATE TABLE public.staff_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES public.venues(id),
 event_id uuid REFERENCES public.events(id),
 name text NOT NULL, email text NOT NULL, phone text NOT NULL,
 gate_name text NOT NULL, token_hash text NOT NULL,
 status text NOT NULL DEFAULT 'Invited' CHECK(status IN ('Invited','Active','Disabled')),
 assignment_id uuid REFERENCES public.venue_staff_assignments(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 sent_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,email)
);
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_invitations FROM anon,authenticated;
GRANT SELECT(id,venue_id,event_id,name,email,phone,gate_name,status,assignment_id,expires_at,sent_at,created_at) ON public.staff_invitations TO authenticated;
CREATE POLICY owner_staff_invitations ON public.staff_invitations FOR SELECT TO authenticated
 USING(coalesce(public.is_venue_owner(venue_id),false));
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.staff_invitations FOR EACH ROW EXECUTE FUNCTION public.audit_change();

CREATE FUNCTION public.manage_staff_invitation(payload jsonb, target_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.staff_invitations; venue uuid; chosen_event uuid; mail text;
BEGIN
 PERFORM public.assert_fields(payload,ARRAY['venue_id','event_id','name','email','phone','gate_name','token_hash','action']);
 venue:=(payload->>'venue_id')::uuid;
 IF NOT coalesce(public.is_venue_owner(venue),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
 IF target_id IS NOT NULL THEN
  SELECT * INTO item FROM public.staff_invitations WHERE id=target_id AND venue_id=venue FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
  IF payload->>'action'='disable' THEN
   UPDATE public.staff_invitations SET status='Disabled' WHERE id=item.id;
   UPDATE public.venue_staff_assignments SET active=false WHERE id=item.assignment_id AND venue_id=venue;
   RETURN item.id;
  END IF;
  IF payload->>'action'='resend' THEN
   IF item.status<>'Invited' OR item.sent_at>now()-interval '60 seconds' THEN RAISE EXCEPTION 'Wait one minute before resending a pending invitation.' USING ERRCODE='22023'; END IF;
   IF coalesce(length(payload->>'token_hash'),0)<>64 THEN RAISE EXCEPTION 'Invalid token' USING ERRCODE='22023'; END IF;
   UPDATE public.staff_invitations SET token_hash=payload->>'token_hash',expires_at=now()+interval '24 hours',sent_at=now() WHERE id=item.id;
   RETURN item.id;
  END IF;
 END IF;
 chosen_event:=nullif(payload->>'event_id','')::uuid;
 IF chosen_event IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.events WHERE id=chosen_event AND venue_id=venue) THEN RAISE EXCEPTION 'Event access denied' USING ERRCODE='42501'; END IF;
 IF coalesce(length(trim(payload->>'name')),0) NOT BETWEEN 2 AND 150 OR coalesce(length(trim(payload->>'phone')),0) NOT BETWEEN 6 AND 30 OR coalesce(length(trim(payload->>'gate_name')),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Enter a name, phone and entry gate.' USING ERRCODE='22023'; END IF;
 IF target_id IS NOT NULL THEN
  UPDATE public.staff_invitations SET name=trim(payload->>'name'),phone=trim(payload->>'phone'),event_id=chosen_event,gate_name=trim(payload->>'gate_name') WHERE id=item.id;
  UPDATE public.venue_staff_assignments SET event_id=chosen_event,gate_name=trim(payload->>'gate_name') WHERE id=item.assignment_id AND venue_id=venue;
  RETURN item.id;
 END IF;
 mail:=lower(trim(payload->>'email'));
 IF mail IS NULL OR length(mail)>254 OR mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR coalesce(length(payload->>'token_hash'),0)<>64 THEN RAISE EXCEPTION 'Enter a valid email.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.users WHERE lower(email)=mail AND (role NOT IN ('customer','staff') OR NOT active)) THEN RAISE EXCEPTION 'Use a separate active staff email, not an owner or administrator account.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.staff_invitations(venue_id,event_id,name,email,phone,gate_name,token_hash)
 VALUES(venue,chosen_event,trim(payload->>'name'),mail,trim(payload->>'phone'),trim(payload->>'gate_name'),payload->>'token_hash') RETURNING id INTO target_id;
 RETURN target_id;
END $$;

CREATE FUNCTION public.accept_staff_invitation(invitation_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.staff_invitations; person public.users; assignment uuid;
BEGIN
 SELECT * INTO item FROM public.staff_invitations WHERE token_hash=invitation_hash FOR UPDATE;
 IF NOT FOUND OR item.status='Disabled' OR item.expires_at<now() THEN RAISE EXCEPTION 'Invitation expired or revoked. Ask the venue owner to resend it.' USING ERRCODE='22023'; END IF;
 SELECT * INTO person FROM public.users WHERE id=auth.uid() AND active FOR UPDATE;
 IF NOT FOUND OR lower(person.email)<>item.email OR person.role NOT IN ('customer','staff') OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email)=item.email) THEN RAISE EXCEPTION 'Sign in using the invited email address.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=item.venue_id AND active) THEN RAISE EXCEPTION 'Venue unavailable' USING ERRCODE='42501'; END IF;
 IF item.status='Active' THEN RETURN; END IF;
 UPDATE public.users SET role='staff',name=CASE WHEN person.role='customer' THEN item.name ELSE name END,phone=CASE WHEN person.role='customer' THEN item.phone ELSE phone END WHERE id=auth.uid();
 INSERT INTO public.venue_staff_assignments(user_id,venue_id,event_id,gate_name,active) VALUES(auth.uid(),item.venue_id,item.event_id,item.gate_name,true) RETURNING id INTO assignment;
 UPDATE public.staff_invitations SET status='Active',assignment_id=assignment WHERE id=item.id;
END $$;
REVOKE ALL ON FUNCTION public.manage_staff_invitation(jsonb,uuid),public.accept_staff_invitation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_staff_invitation(jsonb,uuid),public.accept_staff_invitation(text) TO authenticated;
NOTIFY pgrst,'reload schema';
