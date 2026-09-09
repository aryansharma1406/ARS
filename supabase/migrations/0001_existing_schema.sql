-- Supabase PostgreSQL Schema for NoxPass Nightlife Ticketing Platform

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'promoter', 'venue_owner', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VENUES TABLE
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  image TEXT,
  commission_percentage NUMERIC(5,2) DEFAULT 20.00,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  category TEXT DEFAULT 'Techno / House',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ticket_price NUMERIC(10,2) NOT NULL,
  ticket_capacity INTEGER NOT NULL,
  tickets_sold INTEGER DEFAULT 0,
  age_limit INTEGER DEFAULT 21,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SOURCES (PROMOTERS / ATTRIBUTION) TABLE
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  commission_percentage NUMERIC(5,2) DEFAULT 20.00,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  source_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  ticket_type TEXT DEFAULT 'General VIP Entry',
  subtotal NUMERIC(10,2) NOT NULL,
  fees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  source_code TEXT,
  qr_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'PAYMENT_FAILED', 'REFUNDED')),
  ticket_type TEXT DEFAULT 'General VIP Entry',
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SCANS TABLE (ENTRY AUDIT LOG)
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  result TEXT NOT NULL CHECK (result IN ('VALID', 'ALREADY_USED', 'INVALID'))
);

-- 8. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  gross_revenue NUMERIC(10,2) NOT NULL,
  refunds NUMERIC(10,2) DEFAULT 0.00,
  eligible_revenue NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  venue_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. VENUE OWNERSHIP: authoritative multi-tenant assignment boundary
CREATE TABLE IF NOT EXISTS public.venue_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

-- 10. VENUE-SCOPED STAFF ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.venue_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  gate_name TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. IMMUTABLE OWNER ACTION AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.owner_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  sales_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  settlement_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  event_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR SPEED AND INTEGRITY
CREATE INDEX IF NOT EXISTS idx_events_venue ON public.events(venue_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_event ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source_code);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_tickets_order ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_scans_ticket ON public.scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_venue_owners_user ON public.venue_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_owners_venue ON public.venue_owners(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_venue ON public.venue_staff_assignments(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_event ON public.venue_staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_venue_created ON public.audit_logs(venue_id, created_at DESC);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_notification_preferences ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ PERMISSIONS FOR EVENTS AND VENUES
CREATE POLICY "Public Read Venues" ON public.venues FOR SELECT USING (
  active = true AND NOT EXISTS (SELECT 1 FROM public.venue_owners vo WHERE vo.user_id = auth.uid())
);
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (
  published = true AND NOT EXISTS (SELECT 1 FROM public.venue_owners vo WHERE vo.user_id = auth.uid())
);

-- TICKET READ FOR CUSTOMERS
CREATE POLICY "Customer Read Ticket" ON public.tickets FOR SELECT USING (customer_id = auth.uid());

-- OWNER TENANT BOUNDARY. auth.uid() must map to public.users.id.
CREATE OR REPLACE FUNCTION public.is_venue_owner(target_venue UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_owners vo
    JOIN public.users u ON u.id = vo.user_id
    WHERE vo.user_id = auth.uid()
      AND vo.venue_id = target_venue
      AND u.role IN ('venue_owner', 'admin', 'super_admin')
  );
$$;

CREATE POLICY "Owners Read Assignments" ON public.venue_owners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owners Read Own Venues" ON public.venues FOR SELECT USING (public.is_venue_owner(id));
CREATE POLICY "Owners Read Own Events" ON public.events FOR SELECT USING (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Manage Own Events" ON public.events FOR ALL USING (public.is_venue_owner(venue_id)) WITH CHECK (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Read Own Sources" ON public.sources FOR SELECT USING (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Read Own Orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_venue_owner(e.venue_id)));
CREATE POLICY "Owners Read Own Tickets" ON public.tickets FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_venue_owner(e.venue_id)));
CREATE POLICY "Owners Read Own Scans" ON public.scans FOR SELECT USING (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Read Own Settlements" ON public.settlements FOR SELECT USING (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Manage Own Staff" ON public.venue_staff_assignments FOR ALL USING (public.is_venue_owner(venue_id)) WITH CHECK (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Read Own Audit" ON public.audit_logs FOR SELECT USING (public.is_venue_owner(venue_id));
CREATE POLICY "Owners Append Own Audit" ON public.audit_logs FOR INSERT WITH CHECK (actor_user_id = auth.uid() AND public.is_venue_owner(venue_id));
CREATE POLICY "Owners Manage Own Notifications" ON public.owner_notification_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
