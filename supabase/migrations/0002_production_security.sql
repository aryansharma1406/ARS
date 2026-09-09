-- Extend the existing identity and tenancy model. Apply in one transaction.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
UPDATE public.users SET active = false WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = public.users.id);
ALTER TABLE public.users ADD CONSTRAINT users_auth_identity_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.venue_owners ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS gate_name text;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS gate_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
UPDATE public.audit_logs a SET actor_role = u.role FROM public.users u WHERE u.id = a.actor_user_id;
ALTER TABLE public.audit_logs ALTER COLUMN venue_id DROP NOT NULL;
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_venue_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE RESTRICT;
-- Deleting an event must never widen an event-only staff assignment to the venue.
ALTER TABLE public.venue_staff_assignments DROP CONSTRAINT venue_staff_assignments_event_id_fkey;
ALTER TABLE public.venue_staff_assignments ADD CONSTRAINT venue_staff_assignments_event_id_fkey FOREIGN KEY(event_id) REFERENCES public.events(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX orders_razorpay_order_unique ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX orders_razorpay_payment_unique ON public.orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX idx_staff_user_active ON public.venue_staff_assignments(user_id, active);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);

CREATE OR REPLACE FUNCTION public.provision_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users(id,name,email,role,active)
  VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'name',''),NEW.email,'customer',true);
  RETURN NEW;
END $$;
CREATE TRIGGER provision_auth_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.provision_auth_profile();
INSERT INTO public.users(id,name,email,role,active)
SELECT id,coalesce(raw_user_meta_data->>'name',''),email,'customer',true FROM auth.users a
WHERE a.email IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=a.id)
ON CONFLICT(email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT role FROM public.users WHERE id=auth.uid() AND active;
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(public.app_role() IN ('admin','super_admin'),false);
$$;
CREATE OR REPLACE FUNCTION public.is_venue_owner(target_venue uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.app_role()='venue_owner' AND EXISTS(
   SELECT 1 FROM public.venue_owners o JOIN public.venues v ON v.id=o.venue_id
   WHERE o.user_id=auth.uid() AND o.venue_id=target_venue AND o.active AND v.active);
$$;
CREATE OR REPLACE FUNCTION public.is_staff_scope(target_venue uuid, target_event uuid DEFAULT NULL, target_gate text DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.app_role()='staff' AND EXISTS(
   SELECT 1 FROM public.venue_staff_assignments a JOIN public.venues v ON v.id=a.venue_id
   WHERE a.user_id=auth.uid() AND a.active AND v.active AND a.venue_id=target_venue
   AND (target_event IS NULL OR a.event_id IS NULL OR a.event_id=target_event)
   AND (target_gate IS NULL OR a.gate_name IS NULL OR a.gate_name=target_gate));
$$;
CREATE OR REPLACE FUNCTION public.owns_event(target_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.events WHERE id=target_event AND public.is_venue_owner(venue_id));
$$;

-- Replace every existing policy on these application tables, including permissive legacy policies.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('users','venues','events','sources','orders','tickets','scans','settlements','venue_owners','venue_staff_assignments','audit_logs','owner_notification_preferences')
 LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['users','venues','events','sources','orders','tickets','scans','settlements','venue_owners','venue_staff_assignments','audit_logs','owner_notification_preferences'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
   EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
GRANT SELECT ON public.events TO anon;
-- Column grants prevent public browsing from exposing the commercial split.
GRANT SELECT(id,name,location,address,description,image,active,created_at) ON public.venues TO anon;
CREATE POLICY profile_read ON public.users FOR SELECT TO authenticated USING (id=auth.uid() OR public.is_admin());
CREATE POLICY venues_read ON public.venues FOR SELECT TO anon,authenticated USING (
 (active AND (auth.uid() IS NULL OR public.app_role()='customer')) OR public.is_admin() OR public.is_venue_owner(id) OR public.is_staff_scope(id));
CREATE POLICY events_read ON public.events FOR SELECT TO anon,authenticated USING (
 (published AND (auth.uid() IS NULL OR public.app_role()='customer') AND EXISTS(SELECT 1 FROM public.venues WHERE id=venue_id AND active))
 OR public.is_admin() OR public.is_venue_owner(venue_id) OR public.is_staff_scope(venue_id,id));
CREATE POLICY sources_read ON public.sources FOR SELECT TO authenticated USING (public.is_admin() OR public.is_venue_owner(venue_id));
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated USING (
 (public.app_role()='customer' AND customer_id=auth.uid()) OR public.is_admin() OR public.owns_event(event_id));
CREATE POLICY tickets_read ON public.tickets FOR SELECT TO authenticated USING (
 (public.app_role()='customer' AND customer_id=auth.uid()) OR public.is_admin() OR public.owns_event(event_id)
 OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND public.is_staff_scope(e.venue_id,e.id,gate_name)));
CREATE POLICY scans_read ON public.scans FOR SELECT TO authenticated USING (
 public.is_admin() OR public.is_venue_owner(venue_id) OR (staff_id=auth.uid() AND public.is_staff_scope(venue_id,event_id,gate_name)));
CREATE POLICY settlements_read ON public.settlements FOR SELECT TO authenticated USING (public.is_admin() OR public.is_venue_owner(venue_id));
CREATE POLICY owners_read ON public.venue_owners FOR SELECT TO authenticated USING (
 public.is_admin() OR (user_id=auth.uid() AND public.app_role()='venue_owner'));
CREATE POLICY staff_read ON public.venue_staff_assignments FOR SELECT TO authenticated USING (
 public.is_admin() OR public.is_venue_owner(venue_id) OR (user_id=auth.uid() AND public.app_role()='staff'));
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin() OR public.is_venue_owner(venue_id));
CREATE POLICY preferences_read ON public.owner_notification_preferences FOR SELECT TO authenticated USING (user_id=auth.uid() AND public.app_role()='venue_owner');

-- All browser roles have read-only table access. Narrow functions below own every mutation.
CREATE OR REPLACE FUNCTION public.audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb; actor uuid; actor_role text; venue uuid; resource uuid;
BEGIN
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 actor := coalesce(auth.uid(),nullif(current_setting('ars.payment_actor',true),'')::uuid);
 IF actor IS NULL THEN RETURN NULL; END IF; -- offline migrations, not an authenticated application action
 SELECT role INTO actor_role FROM public.users WHERE id=actor;
 resource := coalesce((row_data->>'id')::uuid,(row_data->>'user_id')::uuid);
 IF TG_TABLE_NAME='venues' THEN venue := resource;
 ELSIF row_data ? 'venue_id' THEN venue := (row_data->>'venue_id')::uuid;
 ELSIF row_data ? 'event_id' THEN SELECT venue_id INTO venue FROM public.events WHERE id=(row_data->>'event_id')::uuid;
 END IF;
 INSERT INTO public.audit_logs(actor_user_id,actor_role,venue_id,action,entity_type,entity_id)
 VALUES(actor,actor_role,venue,lower(TG_TABLE_NAME||'.'||TG_OP),TG_TABLE_NAME,resource);
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.immutable_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN RAISE EXCEPTION 'Audit records are immutable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.immutable_audit();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['users','venues','events','sources','venue_owners','venue_staff_assignments','owner_notification_preferences','orders','tickets','scans','settlements'] LOOP
  EXECUTE format('CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_change()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.assert_fields(payload jsonb, allowed text[]) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
 IF jsonb_typeof(payload) <> 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(payload) k WHERE NOT k=ANY(allowed)) THEN
 RAISE EXCEPTION 'Protected or unsupported field' USING ERRCODE='22023'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_event(payload jsonb, target_id uuid DEFAULT NULL, target_venue uuid DEFAULT NULL) RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.events; venue uuid;
BEGIN
 PERFORM public.assert_fields(payload,ARRAY['venue_id','name','description','image','category','date','start_time','end_time','ticket_price','ticket_capacity','age_limit','published']);
 IF target_id IS NULL THEN venue := (payload->>'venue_id')::uuid;
 ELSE SELECT * INTO result FROM public.events WHERE id=target_id FOR UPDATE; venue := result.venue_id; END IF;
 IF venue IS NULL OR (NOT public.is_admin() AND NOT coalesce(public.is_venue_owner(venue),false)) OR (target_venue IS NOT NULL AND target_venue<>venue) THEN
 RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
 IF payload ? 'venue_id' AND (payload->>'venue_id')::uuid<>venue THEN RAISE EXCEPTION 'Cannot move an event' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL THEN
  IF NOT payload ?& ARRAY['venue_id','name','date','start_time','end_time','ticket_price','ticket_capacity','age_limit','published'] THEN RAISE EXCEPTION 'Missing event fields' USING ERRCODE='22023'; END IF;
  result := jsonb_populate_record(NULL::public.events,payload);
  IF length(coalesce(result.name,''))<3 OR result.ticket_price IS NULL OR result.ticket_price<=0 OR result.ticket_capacity IS NULL OR result.ticket_capacity<=0 OR result.age_limit IS NULL OR result.age_limit<18 OR result.published IS NULL THEN RAISE EXCEPTION 'Invalid event' USING ERRCODE='22023'; END IF;
  INSERT INTO public.events(venue_id,name,description,image,category,date,start_time,end_time,ticket_price,ticket_capacity,age_limit,published)
  VALUES(venue,result.name,result.description,result.image,result.category,result.date,result.start_time,result.end_time,result.ticket_price,result.ticket_capacity,result.age_limit,coalesce(result.published,false)) RETURNING * INTO result;
 ELSE
  result := jsonb_populate_record(result,payload);
  IF result.ticket_price IS NULL OR result.ticket_price<=0 OR result.ticket_capacity IS NULL OR result.ticket_capacity<result.tickets_sold OR result.age_limit IS NULL OR result.age_limit<18 OR result.published IS NULL OR length(coalesce(result.name,''))<3 THEN RAISE EXCEPTION 'Invalid event' USING ERRCODE='22023'; END IF;
  UPDATE public.events SET name=result.name,description=result.description,image=result.image,category=result.category,date=result.date,start_time=result.start_time,end_time=result.end_time,ticket_price=result.ticket_price,ticket_capacity=result.ticket_capacity,age_limit=result.age_limit,published=result.published WHERE id=target_id RETURNING * INTO result;
 END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_venue(payload jsonb, target_id uuid DEFAULT NULL) RETURNS public.venues
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.venues;
BEGIN
 IF public.is_admin() THEN
  PERFORM public.assert_fields(payload,ARRAY['name','location','address','description','image','commission_percentage','active']);
 ELSE
  IF target_id IS NULL OR NOT coalesce(public.is_venue_owner(target_id),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
  PERFORM public.assert_fields(payload,ARRAY['name','address','description','image']);
 END IF;
 IF target_id IS NULL THEN
  result:=jsonb_populate_record(NULL::public.venues,payload);
  INSERT INTO public.venues(name,location,address,description,image,commission_percentage,active)
  VALUES(result.name,result.location,result.address,result.description,result.image,coalesce(result.commission_percentage,20),coalesce(result.active,true)) RETURNING * INTO result;
 ELSE
  SELECT * INTO result FROM public.venues WHERE id=target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
  result:=jsonb_populate_record(result,payload);
  UPDATE public.venues SET name=result.name,location=result.location,address=result.address,description=result.description,image=result.image,commission_percentage=result.commission_percentage,active=result.active WHERE id=target_id RETURNING * INTO result;
 END IF;
 IF result.commission_percentage NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid commission' USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_staff_assignment(payload jsonb, target_id uuid DEFAULT NULL, target_venue uuid DEFAULT NULL) RETURNS public.venue_staff_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.venue_staff_assignments; venue uuid;
BEGIN
 IF target_id IS NULL THEN
  PERFORM public.assert_fields(payload,ARRAY['user_id','venue_id','event_id','gate_name','active']);
  result:=jsonb_populate_record(NULL::public.venue_staff_assignments,payload); venue:=result.venue_id;
 ELSE
  PERFORM public.assert_fields(payload,ARRAY['active']);
  SELECT * INTO result FROM public.venue_staff_assignments WHERE id=target_id FOR UPDATE; venue:=result.venue_id;
 END IF;
 IF venue IS NULL OR (NOT public.is_admin() AND NOT coalesce(public.is_venue_owner(venue),false)) OR (target_venue IS NOT NULL AND venue<>target_venue) THEN RAISE EXCEPTION 'Assignment access denied' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=result.user_id AND role='staff' AND active) THEN RAISE EXCEPTION 'An active staff account is required' USING ERRCODE='22023'; END IF;
 IF result.event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.events WHERE id=result.event_id AND venue_id=venue) THEN RAISE EXCEPTION 'Event belongs to another venue' USING ERRCODE='42501'; END IF;
 IF target_id IS NULL THEN
  INSERT INTO public.venue_staff_assignments(user_id,venue_id,event_id,gate_name,active) VALUES(result.user_id,venue,result.event_id,nullif(result.gate_name,''),true) RETURNING * INTO result;
 ELSE UPDATE public.venue_staff_assignments SET active=(payload->>'active')::boolean WHERE id=target_id RETURNING * INTO result; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_preferences(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
 IF public.app_role() IS DISTINCT FROM 'venue_owner' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 PERFORM public.assert_fields(payload,ARRAY['email','sales','settlements','events']);
 INSERT INTO public.owner_notification_preferences(user_id,email_notifications,sales_notifications,settlement_notifications,event_notifications)
 VALUES(auth.uid(),(payload->>'email')::boolean,(payload->>'sales')::boolean,(payload->>'settlements')::boolean,(payload->>'events')::boolean)
 ON CONFLICT(user_id) DO UPDATE SET email_notifications=excluded.email_notifications,sales_notifications=excluded.sales_notifications,settlement_notifications=excluded.settlement_notifications,event_notifications=excluded.event_notifications,updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_source(payload jsonb) RETURNS public.sources
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE result public.sources; BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 PERFORM public.assert_fields(payload,ARRAY['venue_id','name','code','commission_percentage','active']);
 result:=jsonb_populate_record(NULL::public.sources,payload);
 IF result.commission_percentage NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid commission' USING ERRCODE='22023'; END IF;
 INSERT INTO public.sources(venue_id,name,code,commission_percentage,active) VALUES(result.venue_id,result.name,result.code,result.commission_percentage,result.active) RETURNING * INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_access(target_user uuid, new_role text, is_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE old_role text; BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT role INTO old_role FROM public.users WHERE id=target_user FOR UPDATE;
 IF old_role IS NULL OR (public.app_role()<>'super_admin' AND (old_role IN ('admin','super_admin') OR new_role IN ('admin','super_admin'))) THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE='42501'; END IF;
 IF new_role NOT IN ('customer','staff','venue_owner','admin','super_admin') OR target_user=auth.uid() THEN RAISE EXCEPTION 'Invalid role change' USING ERRCODE='42501'; END IF;
 UPDATE public.users SET role=new_role,active=is_active WHERE id=target_user;
END $$;
CREATE OR REPLACE FUNCTION public.admin_assign_owner(target_user uuid, target_venue uuid, is_active boolean DEFAULT true) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=target_user AND role='venue_owner' AND active) THEN RAISE EXCEPTION 'Active owner required' USING ERRCODE='22023'; END IF;
 INSERT INTO public.venue_owners(user_id,venue_id,active) VALUES(target_user,target_venue,is_active)
 ON CONFLICT(user_id,venue_id) DO UPDATE SET active=excluded.active;
END $$;

-- Payment reservation uses persisted server prices and attribution. Only server credentials can call it.
CREATE OR REPLACE FUNCTION public.reserve_order(target_customer uuid, target_event uuid, ticket_quantity integer, guest_name text, guest_phone text, referral_code text DEFAULT NULL) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE customer public.users; evt public.events; result public.orders; reserved integer; sub numeric; fee numeric;
BEGIN
 SELECT * INTO customer FROM public.users WHERE id=target_customer AND active AND role='customer' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 PERFORM set_config('ars.payment_actor',target_customer::text,true);
 IF ticket_quantity IS NULL OR ticket_quantity NOT BETWEEN 1 AND 10 OR guest_name IS NULL OR guest_phone IS NULL OR length(trim(guest_name)) NOT BETWEEN 2 AND 150 OR length(guest_phone) NOT BETWEEN 6 AND 30 THEN RAISE EXCEPTION 'Invalid booking' USING ERRCODE='22023'; END IF;
 SELECT * INTO evt FROM public.events WHERE id=target_event AND published FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=evt.venue_id AND active) THEN RAISE EXCEPTION 'Event unavailable' USING ERRCODE='22023'; END IF;
 SELECT coalesce(sum(quantity),0) INTO reserved FROM public.orders WHERE event_id=evt.id AND payment_status='PENDING' AND reservation_expires_at>now();
 IF evt.tickets_sold+reserved+ticket_quantity>evt.ticket_capacity THEN RAISE EXCEPTION 'Event capacity exceeded'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE customer_id=target_customer AND payment_status='PENDING' AND reservation_expires_at>now())>=3 THEN RAISE EXCEPTION 'Too many pending orders'; END IF;
 IF referral_code IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sources WHERE code=referral_code AND venue_id=evt.venue_id AND active) THEN RAISE EXCEPTION 'Invalid referral for this venue' USING ERRCODE='22023'; END IF;
 sub:=evt.ticket_price*ticket_quantity; fee:=round(sub*0.03);
 INSERT INTO public.orders(customer_id,customer_name,customer_email,customer_phone,event_id,source_code,quantity,ticket_type,subtotal,fees,total,payment_status,reservation_expires_at)
 VALUES(target_customer,guest_name,customer.email,guest_phone,evt.id,referral_code,ticket_quantity,'General VIP Entry',sub,fee,sub+fee,'PENDING',now()+interval '15 minutes') RETURNING * INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.bind_payment_order(target_customer uuid, target_order uuid, provider_order text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=target_customer AND role='customer' AND active) THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 PERFORM set_config('ars.payment_actor',target_customer::text,true);
 UPDATE public.orders SET razorpay_order_id=provider_order WHERE id=target_order AND customer_id=target_customer AND payment_status='PENDING' AND razorpay_order_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order access denied' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.finalize_payment(target_customer uuid, provider_order text, provider_payment text, captured_amount bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ord public.orders; evt public.events; generated jsonb; i integer;
BEGIN
 PERFORM 1 FROM public.users WHERE id=target_customer AND role='customer' AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
 PERFORM set_config('ars.payment_actor',target_customer::text,true);
 SELECT * INTO ord FROM public.orders WHERE razorpay_order_id=provider_order AND customer_id=target_customer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order access denied' USING ERRCODE='42501'; END IF;
 IF captured_amount IS NULL OR captured_amount<>round(ord.total*100) THEN RAISE EXCEPTION 'Payment amount mismatch' USING ERRCODE='22023'; END IF;
 IF ord.payment_status='PAID' THEN
  IF ord.razorpay_payment_id IS DISTINCT FROM provider_payment THEN RAISE EXCEPTION 'Payment mismatch' USING ERRCODE='42501'; END IF;
 ELSIF ord.payment_status='PENDING' THEN
  SELECT * INTO evt FROM public.events WHERE id=ord.event_id FOR UPDATE;
  IF evt.tickets_sold+ord.quantity>evt.ticket_capacity THEN RAISE EXCEPTION 'Capacity unavailable; payment needs reconciliation'; END IF;
  UPDATE public.orders SET payment_status='PAID',razorpay_payment_id=provider_payment WHERE id=ord.id RETURNING * INTO ord;
  UPDATE public.events SET tickets_sold=tickets_sold+ord.quantity WHERE id=evt.id;
  FOR i IN 1..ord.quantity LOOP
   INSERT INTO public.tickets(order_id,event_id,customer_id,customer_name,customer_email,customer_phone,source_code,qr_token,status,ticket_type)
   VALUES(ord.id,ord.event_id,ord.customer_id,CASE WHEN i=1 THEN ord.customer_name ELSE ord.customer_name||' (Guest '||i||')' END,ord.customer_email,ord.customer_phone,ord.source_code,replace(gen_random_uuid()::text,'-',''),'VALID',ord.ticket_type);
  END LOOP;
 ELSE RAISE EXCEPTION 'Order cannot be fulfilled' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO generated FROM public.tickets t WHERE order_id=ord.id;
 RETURN jsonb_build_object('order',to_jsonb(ord),'tickets',generated);
END $$;

CREATE OR REPLACE FUNCTION public.scan_ticket(token text, assignment_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment public.venue_staff_assignments; pass public.tickets; evt public.events; outcome text; message text;
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
 SELECT * INTO evt FROM public.events WHERE id=pass.event_id;
 IF evt.venue_id<>assignment.venue_id OR (assignment.event_id IS NOT NULL AND assignment.event_id<>evt.id)
 OR (pass.gate_name IS NOT NULL AND assignment.gate_name IS NOT NULL AND pass.gate_name<>assignment.gate_name) THEN
 RAISE EXCEPTION 'Ticket outside scanner scope' USING ERRCODE='42501'; END IF;
 IF pass.status='USED' THEN outcome:='ALREADY_USED'; message:='Ticket already used. Duplicate entry denied.';
 ELSIF pass.status<>'VALID' OR NOT EXISTS(SELECT 1 FROM public.orders WHERE id=pass.order_id AND payment_status='PAID') THEN outcome:='INVALID'; message:='Ticket is not valid for entry.';
 ELSE
  outcome:='VALID'; message:='✓ VALID TICKET - ENTRY GRANTED';
  UPDATE public.tickets SET status='USED',scanned_at=now(),scanned_by=auth.uid() WHERE id=pass.id RETURNING * INTO pass;
 END IF;
 INSERT INTO public.scans(ticket_id,staff_id,venue_id,event_id,gate_name,result) VALUES(pass.id,auth.uid(),evt.venue_id,evt.id,assignment.gate_name,outcome);
 RETURN jsonb_build_object('result',outcome,'message',message,'ticket',jsonb_build_object('id',pass.id,'customer_name',pass.customer_name,'event_name',evt.name,'ticket_type',pass.ticket_type,'status',pass.status,'scanned_at',pass.scanned_at));
END $$;

-- Tighten function execution; SECURITY DEFINER never means a public permission bypass.
REVOKE ALL ON FUNCTION public.provision_auth_profile(),public.audit_change(),public.immutable_audit(),public.assert_fields(jsonb,text[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.app_role(),public.is_admin(),public.is_venue_owner(uuid),public.is_staff_scope(uuid,uuid,text),public.owns_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_role(),public.is_admin(),public.is_venue_owner(uuid),public.is_staff_scope(uuid,uuid,text),public.owns_event(uuid) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.save_event(jsonb,uuid,uuid),public.save_venue(jsonb,uuid),public.save_staff_assignment(jsonb,uuid,uuid),public.save_preferences(jsonb),public.admin_create_source(jsonb),public.admin_set_user_access(uuid,text,boolean),public.admin_assign_owner(uuid,uuid,boolean),public.scan_ticket(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_event(jsonb,uuid,uuid),public.save_venue(jsonb,uuid),public.save_staff_assignment(jsonb,uuid,uuid),public.save_preferences(jsonb),public.admin_create_source(jsonb),public.admin_set_user_access(uuid,text,boolean),public.admin_assign_owner(uuid,uuid,boolean),public.scan_ticket(text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.reserve_order(uuid,uuid,integer,text,text,text),public.bind_payment_order(uuid,uuid,text),public.finalize_payment(uuid,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order(uuid,uuid,integer,text,text,text),public.bind_payment_order(uuid,uuid,text),public.finalize_payment(uuid,text,text,bigint) TO service_role;
GRANT SELECT ON public.orders TO service_role;

-- Financial venue columns are not part of the public or staff catalog.
REVOKE SELECT ON public.venues FROM authenticated;
GRANT SELECT(id,name,location,address,description,image,active,created_at) ON public.venues TO authenticated;
CREATE OR REPLACE FUNCTION public.business_venues(target_venue uuid DEFAULT NULL) RETURNS SETOF public.venues
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$ BEGIN
 IF NOT public.is_admin() AND public.app_role() IS DISTINCT FROM 'venue_owner' THEN RAISE EXCEPTION 'Business access required' USING ERRCODE='42501'; END IF;
 IF target_venue IS NOT NULL AND NOT public.is_admin() AND NOT coalesce(public.is_venue_owner(target_venue),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT * FROM public.venues v WHERE (target_venue IS NULL OR v.id=target_venue) AND (public.is_admin() OR public.is_venue_owner(v.id));
END $$;
REVOKE ALL ON FUNCTION public.business_venues(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.business_venues(uuid) TO authenticated;

CREATE TRIGGER immutable_audit_truncate BEFORE TRUNCATE ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.immutable_audit();

-- A purchaser retains event details on an existing pass after an event is unpublished.
CREATE OR REPLACE FUNCTION public.customer_event(target_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.app_role()='customer' AND EXISTS(SELECT 1 FROM public.tickets WHERE event_id=target_event AND customer_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.customer_event(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_event(uuid) TO authenticated;
CREATE POLICY customer_ticket_event ON public.events FOR SELECT TO authenticated USING (public.customer_event(id));
