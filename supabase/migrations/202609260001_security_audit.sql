BEGIN;

-- A disabled account must return false, never SQL NULL. Callers that negate
-- this helper (including public tier discovery) must fail closed.
CREATE OR REPLACE FUNCTION public.is_venue_owner(target_venue uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.app_role()='venue_owner' AND EXISTS(
   SELECT 1 FROM public.venue_owners o JOIN public.venues v ON v.id=o.venue_id
   WHERE o.user_id=auth.uid() AND o.venue_id=target_venue AND o.active AND v.active),false);
$$;

-- Keep the existing scan implementation. Bind replay receipts to the operation
-- as well as actor, assignment and token. Group confirmations have a quantity;
-- normal scans/group previews do not.
CREATE OR REPLACE FUNCTION public.mobile_scan_ticket(token text,assignment_id uuid,request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.venue_staff_assignments; prior public.staff_scan_requests; outcome jsonb; fingerprint text; venue_name text; scanned_event uuid;
BEGIN
 PERFORM 1 FROM public.users WHERE id=auth.uid() AND role='staff' AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active staff login required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.venue_staff_assignments va WHERE va.id=assignment_id AND va.user_id=auth.uid() AND va.active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scanner assignment unavailable' USING ERRCODE='42501'; END IF;
 SELECT v.name INTO venue_name FROM public.venues v WHERE v.id=a.venue_id AND v.active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venue unavailable' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR token IS NULL OR length(token)>4096 THEN RAISE EXCEPTION 'Invalid scan request' USING ERRCODE='22023'; END IF;
 fingerprint:=encode(sha256(convert_to(trim(token),'UTF8')),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 SELECT * INTO prior FROM public.staff_scan_requests r WHERE r.staff_id=auth.uid() AND r.request_id=mobile_scan_ticket.request_id;
 IF FOUND THEN
   IF prior.assignment_id<>assignment_id OR prior.token_hash<>fingerprint OR prior.requested_quantity IS NOT NULL THEN RAISE EXCEPTION 'Request ID already used for another scan' USING ERRCODE='22023'; END IF;
   RETURN prior.response||jsonb_build_object('replayed',true);
 END IF;
 IF length(trim(token)) NOT BETWEEN 1 AND 200 THEN
   outcome:=jsonb_build_object('result','INVALID','message','This is not an ARS pass.');
 ELSE
   BEGIN
     outcome:=public.scan_ticket(trim(token),assignment_id);
   EXCEPTION WHEN insufficient_privilege THEN
     outcome:=jsonb_build_object('result','INVALID','message','Pass not valid for this assigned venue, event or gate.');
   END;
 END IF;
 IF outcome->'ticket' IS NULL OR outcome->'ticket'='null'::jsonb THEN
   INSERT INTO public.scans(ticket_id,staff_id,venue_id,event_id,gate_name,result)
   VALUES(NULL,auth.uid(),a.venue_id,a.event_id,a.gate_name,'INVALID');
 ELSE
   SELECT t.event_id INTO scanned_event FROM public.tickets t WHERE t.id=(outcome->'ticket'->>'id')::uuid;
   outcome:=jsonb_set(outcome,'{ticket}',(outcome->'ticket')||jsonb_build_object('event_id',scanned_event,'venue_name',venue_name));
 END IF;
 outcome:=outcome||jsonb_build_object('request_id',request_id,'recorded_at',now(),'replayed',false);
 INSERT INTO public.staff_scan_requests(staff_id,request_id,assignment_id,venue_id,token_hash,response)
 VALUES(auth.uid(),request_id,a.id,a.venue_id,fingerprint,outcome);
 RETURN outcome;
END $$;
REVOKE ALL ON FUNCTION public.is_venue_owner(uuid),public.mobile_scan_ticket(text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_venue_owner(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_scan_ticket(text,uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
