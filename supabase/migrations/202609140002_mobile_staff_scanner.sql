BEGIN;
-- Operational request receipts only. Tickets/customers remain in their existing tables.
CREATE TABLE public.staff_scan_requests (
 staff_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 assignment_id uuid NOT NULL REFERENCES public.venue_staff_assignments(id) ON DELETE RESTRICT,
 venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
 token_hash text NOT NULL,
 response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(staff_id,request_id)
);
ALTER TABLE public.staff_scan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_scan_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_scan_requests FROM PUBLIC,anon,authenticated;
-- Receipts are accessed only through the scoped scan RPC; never store raw QR tokens.
CREATE INDEX staff_scan_requests_venue_time ON public.staff_scan_requests(venue_id,created_at DESC);

CREATE FUNCTION public.mobile_staff_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE person public.users; assignments jsonb;
BEGIN
 SELECT * INTO person FROM public.users WHERE id=auth.uid() AND role='staff' AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active staff login required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'venue_id',a.venue_id,'venue_name',v.name,
   'event_id',a.event_id,'event_name',e.name,'gate_name',coalesce(a.gate_name,'All gates')) ORDER BY v.name,a.gate_name,a.id),'[]'::jsonb)
 INTO assignments FROM public.venue_staff_assignments a JOIN public.venues v ON v.id=a.venue_id
 LEFT JOIN public.events e ON e.id=a.event_id
 WHERE a.user_id=person.id AND a.active AND v.active;
 RETURN jsonb_build_object('staff_id',person.id,'name',person.name,'assignments',assignments);
END $$;

CREATE FUNCTION public.mobile_staff_stats(target_assignment uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.venue_staff_assignments; ids uuid[]; total bigint; used bigint; remaining bigint; today date;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND role='staff' AND active) THEN
   RAISE EXCEPTION 'Active staff login required' USING ERRCODE='42501'; END IF;
 SELECT va.* INTO a FROM public.venue_staff_assignments va JOIN public.venues v ON v.id=va.venue_id
 WHERE va.id=target_assignment AND va.user_id=auth.uid() AND va.active AND v.active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scanner assignment unavailable' USING ERRCODE='42501'; END IF;
 today:=(now() AT TIME ZONE 'Asia/Kolkata')::date;
 SELECT coalesce(array_agg(e.id),'{}'::uuid[]),coalesce(sum(e.ticket_capacity),0) INTO ids,total
 FROM public.events e WHERE e.venue_id=a.venue_id AND (a.event_id IS NULL OR e.id=a.event_id) AND e.published
 AND (e.date=today OR (e.date=today-1 AND
   ((e.date+e.end_time+CASE WHEN e.end_time<=e.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE 'Asia/Kolkata')>now()));
 SELECT count(*) FILTER(WHERE t.status='USED'),count(*) FILTER(WHERE t.status='VALID') INTO used,remaining
 FROM public.tickets t JOIN public.orders o ON o.id=t.order_id
 WHERE t.event_id=ANY(ids) AND o.payment_status='PAID';
 RETURN jsonb_build_object('checked_in',used,'remaining',remaining,'capacity',total,'event_count',cardinality(ids),
   'as_of',now(),'date',today,'scope','Assigned events, all gates / IST');
END $$;

CREATE FUNCTION public.mobile_scan_ticket(token text,assignment_id uuid,request_id uuid) RETURNS jsonb
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
   IF prior.assignment_id<>assignment_id OR prior.token_hash<>fingerprint THEN RAISE EXCEPTION 'Request ID already used for another scan' USING ERRCODE='22023'; END IF;
   RETURN prior.response||jsonb_build_object('replayed',true);
 END IF;
 IF length(trim(token)) NOT BETWEEN 1 AND 200 THEN
   outcome:=jsonb_build_object('result','INVALID','message','This is not an ARS pass.');
 ELSE
   BEGIN
     -- The original ticket/payment/gate checks, row lock and scan write remain unchanged.
     outcome:=public.scan_ticket(trim(token),assignment_id);
   EXCEPTION WHEN insufficient_privilege THEN
     outcome:=jsonb_build_object('result','INVALID','message','Pass not valid for this assigned venue, event or gate.');
   END;
 END IF;
 IF outcome->'ticket' IS NULL OR outcome->'ticket'='null'::jsonb THEN
   -- Unknown/out-of-scope codes have no safe ticket/event association. Do not invent one.
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
REVOKE ALL ON FUNCTION public.mobile_staff_context(),public.mobile_staff_stats(uuid),public.mobile_scan_ticket(text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_staff_context(),public.mobile_staff_stats(uuid),public.mobile_scan_ticket(text,uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
