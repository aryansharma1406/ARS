-- Seed Data for NoxPass Platform

-- 1. VENUES
INSERT INTO public.venues (id, name, location, address, description, image, commission_percentage, active)
VALUES 
(
  'a1010101-1111-4111-8111-111111111111',
  'Club Xtreme',
  'Goa',
  'Tito''s Lane, Baga, Calangute, Goa 403516',
  'Goa''s premier high-energy superclub featuring world-class acoustic systems, immersive LED matrix ceilings, and international DJ lineups right on the iconic Tito''s Lane.',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
  20.00,
  true
),
(
  'b2020202-2222-4222-8222-222222222222',
  'SinQ Night Club',
  'Candolim, Goa',
  'Opp. Taj Holiday Village, Candolim, Goa 403515',
  'Upscale poolside nightclub with private cabanas, outdoor dance decks, and state-of-the-art lounge vibe.',
  'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1200&auto=format&fit=crop',
  18.00,
  true
);

-- 2. SOURCES (PROMOTERS / ATTRIBUTION CODES)
INSERT INTO public.sources (id, venue_id, name, code, commission_percentage, active)
VALUES
(
  's1010101-1111-4111-8111-111111111111',
  'a1010101-1111-4111-8111-111111111111',
  'Aryan Sharma (Goa VIP Host)',
  'XYZ-ARYAN',
  20.00,
  true
),
(
  's2020202-2222-4222-8222-222222222222',
  'a1010101-1111-4111-8111-111111111111',
  'Tito''s Lane Influencer Pass',
  'INSTA-GOA',
  15.00,
  true
);

-- 3. EVENTS
INSERT INTO public.events (id, venue_id, name, description, image, category, date, start_time, end_time, ticket_price, ticket_capacity, tickets_sold, age_limit, published)
VALUES
(
  'e1010101-1111-4111-8111-111111111111',
  'a1010101-1111-4111-8111-111111111111',
  'Goa Neon Carnival - Friday Rave',
  'Experience Tito''s Lane biggest ultraviolet neon spectacle! Featuring laser synchronized visuals, deep electro-house drops, and complimentary UV face painting.',
  'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1200&auto=format&fit=crop',
  'Deep House / EDM',
  CURRENT_DATE + INTERVAL '1 day',
  '21:00',
  '04:00',
  1499.00,
  400,
  142,
  21,
  true
),
(
  'e2020202-2222-4222-8222-222222222222',
  'a1010101-1111-4111-8111-111111111111',
  'Saturday Midnight Techno Syndicate',
  'Dark underground melodic techno night with Berlin guest DJs. High-intensity bassline and strobe lighting.',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
  'Melodic Techno',
  CURRENT_DATE + INTERVAL '2 days',
  '22:00',
  '05:00',
  1999.00,
  350,
  89,
  21,
  true
),
(
  'e3333333-3333-4333-8333-333333333333',
  'a1010101-1111-4111-8111-111111111111',
  'Bollywood Glamour & Commercial Beats',
  'The ultimate weekend anthem night packed with Bollywood club remixes, celebrity host appearances, and sparkler bottle shows.',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
  'Bollywood / Commercial',
  CURRENT_DATE + INTERVAL '3 days',
  '21:30',
  '03:30',
  1299.00,
  500,
  210,
  18,
  true
);

-- 4. USERS (STAFF & DEMO CUSTOMERS)
INSERT INTO public.users (id, name, email, phone, role)
VALUES
('u1010101-1111-4111-8111-111111111111', 'Xtreme Door Staff', 'staff@clubxtreme.com', '+91 98765 43210', 'staff'),
('u2020202-2222-4222-8222-222222222222', 'Platform Admin', 'admin@noxpass.com', '+91 99999 88888', 'admin'),
('u3333333-3333-4333-8333-333333333333', 'Rohan Mehta', 'rohan@example.com', '+91 98200 11223', 'customer');

-- 5. INITIAL MOCK ORDER & TICKET WITH SOURCE XYZ-ARYAN
INSERT INTO public.orders (id, customer_id, customer_name, customer_email, customer_phone, event_id, source_code, quantity, ticket_type, subtotal, fees, total, payment_status, razorpay_order_id, razorpay_payment_id)
VALUES
(
  'o1010101-1111-4111-8111-111111111111',
  'u3333333-3333-4333-8333-333333333333',
  'Rohan Mehta',
  'rohan@example.com',
  '+91 98200 11223',
  'e1010101-1111-4111-8111-111111111111',
  'XYZ-ARYAN',
  2,
  'General VIP Entry',
  2998.00,
  100.00,
  3098.00,
  'PAID',
  'order_MOCK12345678',
  'pay_MOCK87654321'
);

INSERT INTO public.tickets (id, order_id, event_id, customer_id, customer_name, customer_email, customer_phone, source_code, qr_token, status, ticket_type)
VALUES
(
  't1010101-1111-4111-8111-111111111111',
  'o1010101-1111-4111-8111-111111111111',
  'e1010101-1111-4111-8111-111111111111',
  'u3333333-3333-4333-8333-333333333333',
  'Rohan Mehta',
  'rohan@example.com',
  '+91 98200 11223',
  'XYZ-ARYAN',
  'NOX-XTREME-ROHAN-001',
  'VALID',
  'General VIP Entry'
),
(
  't2020202-2222-4222-8222-222222222222',
  'o1010101-1111-4111-8111-111111111111',
  'e1010101-1111-4111-8111-111111111111',
  'u3333333-3333-4333-8333-333333333333',
  'Rohan Mehta (Guest 2)',
  'rohan@example.com',
  '+91 98200 11223',
  'XYZ-ARYAN',
  'NOX-XTREME-ROHAN-002',
  'VALID',
  'General VIP Entry'
);
