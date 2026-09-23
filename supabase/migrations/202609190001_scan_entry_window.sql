BEGIN;

-- Event date/times are configured in IST. Entry opens at start, closes at end.
-- End <= start denotes the following day, matching existing event scheduling.
CREATE OR REPLACE FUNCTION public.scan_ticket(token text, assignment_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment public.venue_staff_assignments; pass public.tickets; evt public.events; outcome text; message text;
 entry_start timestamptz; entry_end timestamptz; checked_at timestamptz;
BEGIN
 PERFORM 1 FROM public.users WHERE id=auth.uid() AND role='staff' AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staff required' USING ERRCODE='42501'; END IF;
 SELECT * INTO assignment FROM public.venue_staff_assignments WHERE id=assignment_id AND user_id=auth.uid() AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Assignment required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.venues WHERE id=assignment.venue_id AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Venue inactive' USING ERRCODE='42501'; END IF;
 IF length(token)>200 THEN RAISE EXCEPTION 'Invalid token' USING ERRCODE='22023'; END IF;
 SELECT * INTO pass FROM public.tickets WHERE qr_token=token OR id::text=token FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('result','INVALID','message','Ticket not found.'); END IF;
 SELECT * INTO evt FROM public.events WHERE id=pass.event_id FOR SHARE;
 IF evt.venue_id<>assignment.venue_id OR (assignment.event_id IS NOT NULL AND assignment.event_id<>evt.id)
 OR (pass.gate_name IS NOT NULL AND assignment.gate_name IS NOT NULL AND pass.gate_name<>assignment.gate_name) THEN
 RAISE EXCEPTION 'Ticket outside scanner scope' USING ERRCODE='42501'; END IF;
 entry_start:=(evt.date+evt.start_time) AT TIME ZONE 'Asia/Kolkata';
 entry_end:=(evt.date+evt.end_time+CASE WHEN evt.end_time<=evt.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE 'Asia/Kolkata';
 -- Sample after lock waits, not transaction start or a caller-supplied clock.
 checked_at:=clock_timestamp();
 IF pass.status='USED' THEN outcome:='ALREADY_USED'; message:='Ticket already used. Duplicate entry denied.';
 ELSIF pass.status<>'VALID' OR NOT EXISTS(SELECT 1 FROM public.orders WHERE id=pass.order_id AND payment_status='PAID') THEN outcome:='INVALID'; message:='Ticket is not valid for entry.';
 ELSIF entry_start IS NULL OR entry_end IS NULL THEN outcome:='INVALID'; message:='Event entry window unavailable.';
 ELSIF checked_at<entry_start THEN outcome:='INVALID'; message:='EVENT NOT STARTED - NOT VALID YET';
 ELSIF checked_at>=entry_end THEN outcome:='INVALID'; message:='EVENT ENDED';
 ELSE
  outcome:='VALID'; message:='✓ VALID TICKET - ENTRY GRANTED';
  UPDATE public.tickets SET status='USED',scanned_at=checked_at,scanned_by=auth.uid() WHERE id=pass.id RETURNING * INTO pass;
 END IF;
 INSERT INTO public.scans(ticket_id,staff_id,venue_id,event_id,gate_name,result) VALUES(pass.id,auth.uid(),evt.venue_id,evt.id,assignment.gate_name,outcome);
 RETURN jsonb_build_object('result',outcome,'message',message,'ticket',jsonb_build_object('id',pass.id,'customer_name',pass.customer_name,'event_name',evt.name,'ticket_type',pass.ticket_type,'status',pass.status,'scanned_at',pass.scanned_at));
END $$;

REVOKE ALL ON FUNCTION public.scan_ticket(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scan_ticket(text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
