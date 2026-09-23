BEGIN;
CREATE INDEX manual_upi_submitted_idx ON public.manual_upi_payments(submitted_at DESC,order_id) WHERE utr IS NOT NULL;
CREATE INDEX manual_upi_reviewer_idx ON public.manual_upi_payments(reviewed_by,reviewed_at DESC);
CREATE INDEX manual_upi_audit_order_idx ON public.manual_upi_audit(order_id,created_at);

-- Read-only administrative reporting. No reservation or fulfillment mutations.
CREATE FUNCTION public.admin_upi_search(filters jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 checked_at timestamptz:=clock_timestamp();
 query text:=btrim(coalesce(filters->>'q',''));
 wanted_status text:=coalesce(filters->>'status','pending');
 wanted_sort text:=coalesce(filters->>'sort','expiring');
 wanted_range text:=coalesce(filters->>'range','ALL');
 venue_filter uuid:=nullif(filters->>'venue','')::uuid;
 event_filter uuid:=nullif(filters->>'event','')::uuid;
 approver_filter uuid:=nullif(filters->>'approver','')::uuid;
 min_amount numeric:=nullif(filters->>'min','')::numeric;
 max_amount numeric:=nullif(filters->>'max','')::numeric;
 page_index integer:=coalesce((filters->>'page')::integer,0);
 page_size integer:=coalesce((filters->>'size')::integer,25);
 from_time timestamptz; to_time timestamptz; today date;
 result jsonb; options jsonb;
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF length(query)>100 OR page_index<0 OR page_index>100000 OR page_size NOT BETWEEN 1 AND 10001
 OR wanted_status NOT IN ('pending','approved','rejected','expired','all')
 OR wanted_sort NOT IN ('newest','oldest','highest','lowest','approved','expiring')
 OR wanted_range NOT IN ('ALL','TODAY','7D','30D','90D','CUSTOM')
 OR min_amount<0 OR max_amount<0 OR min_amount>max_amount THEN
  RAISE EXCEPTION 'Invalid payment filters' USING ERRCODE='22023';
 END IF;
 today:=(checked_at AT TIME ZONE 'Asia/Kolkata')::date;
 IF wanted_range='CUSTOM' THEN
  IF nullif(filters->>'from','') IS NULL OR nullif(filters->>'to','') IS NULL OR (filters->>'from')::date>(filters->>'to')::date THEN
   RAISE EXCEPTION 'Choose a valid custom date range' USING ERRCODE='22023';
  END IF;
  from_time:=((filters->>'from')::date)::timestamp AT TIME ZONE 'Asia/Kolkata';
  to_time:=(((filters->>'to')::date+1)::timestamp) AT TIME ZONE 'Asia/Kolkata';
 ELSIF wanted_range<>'ALL' THEN
  from_time:=((today-CASE wanted_range WHEN 'TODAY' THEN 0 WHEN '7D' THEN 6 WHEN '30D' THEN 29 ELSE 89 END)::timestamp) AT TIME ZONE 'Asia/Kolkata';
  to_time:=((today+1)::timestamp) AT TIME ZONE 'Asia/Kolkata';
 END IF;
 -- strpos gives literal, case-insensitive matching, not client SQL/wildcards.
 WITH records AS (
  SELECT o.id,o.customer_name,o.customer_email,o.customer_phone,o.event_id,e.name AS event_name,
   e.venue_id,v.name AS venue_name,o.total,o.quantity,o.ticket_type,p.utr,p.submitted_at,
   p.reviewed_at,p.reviewed_by,u.name AS reviewer_name,o.reservation_expires_at AS expires_at,
   CASE WHEN o.payment_status='REFUNDED' THEN 'REFUNDED'
    WHEN p.state IN ('VERIFIED','REJECTED') THEN p.state
    WHEN o.reservation_expires_at IS NULL OR o.reservation_expires_at<=checked_at OR o.payment_status<>'PENDING' THEN 'EXPIRED'
    ELSE p.state END AS state
  FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id
  JOIN public.events e ON e.id=o.event_id JOIN public.venues v ON v.id=e.venue_id
  LEFT JOIN public.users u ON u.id=p.reviewed_by
  WHERE p.utr IS NOT NULL AND p.submitted_at IS NOT NULL
   AND (venue_filter IS NULL OR e.venue_id=venue_filter)
   AND (event_filter IS NULL OR e.id=event_filter)
   AND (approver_filter IS NULL OR p.reviewed_by=approver_filter)
   AND (min_amount IS NULL OR o.total>=min_amount) AND (max_amount IS NULL OR o.total<=max_amount)
   AND (from_time IS NULL OR p.submitted_at>=from_time) AND (to_time IS NULL OR p.submitted_at<to_time)
   AND (query='' OR strpos(lower(concat_ws(' ',p.utr,o.id::text,o.customer_name,o.customer_email,o.customer_phone,e.name)),lower(query))>0
    OR EXISTS(SELECT 1 FROM public.tickets t WHERE t.order_id=o.id AND strpos(lower(t.id::text),lower(query))>0))
 ), matching AS (
  SELECT * FROM records WHERE wanted_status='all'
   OR (wanted_status='pending' AND state='PENDING')
   OR (wanted_status='approved' AND state IN ('VERIFIED','REFUNDED'))
   OR (wanted_status='rejected' AND state='REJECTED')
   OR (wanted_status='expired' AND state='EXPIRED')
 ), paged AS (
  SELECT * FROM matching ORDER BY
   CASE WHEN wanted_sort='expiring' AND state='PENDING' THEN expires_at END ASC NULLS LAST,
   CASE WHEN wanted_sort='approved' AND state IN ('VERIFIED','REFUNDED') THEN reviewed_at END DESC NULLS LAST,
   CASE WHEN wanted_sort='highest' THEN total END DESC,
   CASE WHEN wanted_sort='lowest' THEN total END ASC,
   CASE WHEN wanted_sort='oldest' THEN submitted_at END ASC,
   submitted_at DESC,id DESC LIMIT page_size OFFSET page_index*page_size
 ) SELECT jsonb_build_object('rows',(SELECT coalesce(jsonb_agg(to_jsonb(paged)),'[]'::jsonb) FROM paged),
  'total',(SELECT count(*) FROM matching),'counts',jsonb_build_object(
   'pending',(SELECT count(*) FROM records WHERE state='PENDING'),
   'approved',(SELECT count(*) FROM records WHERE state IN ('VERIFIED','REFUNDED')),
   'rejected',(SELECT count(*) FROM records WHERE state='REJECTED'),
   'expired',(SELECT count(*) FROM records WHERE state='EXPIRED'),
   'all',(SELECT count(*) FROM records))) INTO result;
 SELECT jsonb_build_object(
  'venues',(SELECT coalesce(jsonb_agg(x ORDER BY x.name),'[]'::jsonb) FROM (SELECT id,name FROM public.venues) x),
  'events',(SELECT coalesce(jsonb_agg(x ORDER BY x.name),'[]'::jsonb) FROM (SELECT id,name,venue_id FROM public.events) x),
  'approvers',(SELECT coalesce(jsonb_agg(x ORDER BY x.name),'[]'::jsonb) FROM (SELECT DISTINCT u.id,u.name FROM public.users u JOIN public.manual_upi_payments p ON p.reviewed_by=u.id) x)
 ) INTO options;
 RETURN result||jsonb_build_object('options',options,'holdMinutes',(SELECT hold_minutes FROM public.manual_upi_settings WHERE id=true),'serverTime',checked_at);
END $$;

CREATE FUNCTION public.admin_upi_details(target_order uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
  'order',jsonb_build_object('id',o.id,'customer_name',o.customer_name,'customer_email',o.customer_email,'customer_phone',o.customer_phone,'quantity',o.quantity,'ticket_type',o.ticket_type,'subtotal',o.subtotal,'fees',o.fees,'total',o.total,'payment_status',o.payment_status,'created_at',o.created_at,'expires_at',o.reservation_expires_at,'event_name',e.name,'venue_name',v.name),
  'payment',to_jsonb(p)||jsonb_build_object('reviewer_name',u.name),
  'state',CASE WHEN o.payment_status='REFUNDED' THEN 'REFUNDED' WHEN p.state IN ('VERIFIED','REJECTED') THEN p.state WHEN o.reservation_expires_at IS NULL OR o.reservation_expires_at<=clock_timestamp() OR o.payment_status<>'PENDING' THEN 'EXPIRED' ELSE p.state END,
  'tickets',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'customer_name',t.customer_name,'ticket_type',t.ticket_type,'status',t.status,'scanned_at',t.scanned_at) ORDER BY t.created_at,t.id),'[]'::jsonb) FROM public.tickets t WHERE t.order_id=o.id),
  'audit',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'created_at',a.created_at,'actor_id',a.actor_id,'actor_name',actor.name,'details',a.details) ORDER BY a.created_at DESC,a.id),'[]'::jsonb) FROM public.manual_upi_audit a LEFT JOIN public.users actor ON actor.id=a.actor_id WHERE a.order_id=o.id)
 ) INTO result FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id
 JOIN public.events e ON e.id=o.event_id JOIN public.venues v ON v.id=e.venue_id LEFT JOIN public.users u ON u.id=p.reviewed_by WHERE o.id=target_order;
 IF result IS NULL THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_upi_search(jsonb),public.admin_upi_details(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_upi_search(jsonb),public.admin_upi_details(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
