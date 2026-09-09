import { Venue, Event, Source, Order, Ticket, Scan, Settlement, PromoterAttributionReport, User } from './types';

// Default initial state representing Club Xtreme Goa launch venue
let VENUES_STORE: Venue[] = [
  {
    id: 'v-xtreme-001',
    name: 'Club Xtreme',
    location: 'Goa',
    address: 'Tito\'s Lane, Baga, Calangute, Goa 403516',
    description: 'Goa\'s premier high-energy superclub featuring world-class acoustic systems, immersive LED matrix ceilings, and international DJ lineups right on the iconic Tito\'s Lane.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
    commission_percentage: 20.0,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-sinq-002',
    name: 'SinQ Night Club',
    location: 'Candolim, Goa',
    address: 'Opp. Taj Holiday Village, Candolim, Goa 403515',
    description: 'Upscale poolside nightclub with private cabanas, outdoor dance decks, and state-of-the-art lounge vibe.',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1200&auto=format&fit=crop',
    commission_percentage: 18.0,
    active: true,
    created_at: new Date().toISOString(),
  }
];

let SOURCES_STORE: Source[] = [
  {
    id: 'src-001',
    venue_id: 'v-xtreme-001',
    name: 'Aryan Sharma (VIP Promoter)',
    code: 'XYZ-ARYAN',
    commission_percentage: 20.0,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'src-002',
    venue_id: 'v-xtreme-001',
    name: 'Instagram Goa Nightlife',
    code: 'INSTA-GOA',
    commission_percentage: 15.0,
    active: true,
    created_at: new Date().toISOString(),
  }
];

let EVENTS_STORE: Event[] = [
  {
    id: 'evt-xtreme-neon-01',
    venue_id: 'v-xtreme-001',
    venue_name: 'Club Xtreme, Tito\'s Lane, Goa',
    name: 'Goa Neon Carnival - Friday Rave',
    description: 'Experience Tito\'s Lane biggest ultraviolet neon spectacle! Featuring laser synchronized visuals, deep electro-house drops, and complimentary UV face painting.',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1200&auto=format&fit=crop',
    category: 'Deep House / EDM',
    date: '2026-09-04',
    start_time: '21:00',
    end_time: '04:00',
    ticket_price: 1499,
    ticket_capacity: 400,
    tickets_sold: 142,
    age_limit: 21,
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-xtreme-techno-02',
    venue_id: 'v-xtreme-001',
    venue_name: 'Club Xtreme, Tito\'s Lane, Goa',
    name: 'Saturday Midnight Techno Syndicate',
    description: 'Dark underground melodic techno night with Berlin guest DJs. High-intensity bassline and strobe lighting system.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
    category: 'Melodic Techno',
    date: '2026-09-05',
    start_time: '22:00',
    end_time: '05:00',
    ticket_price: 1999,
    ticket_capacity: 350,
    tickets_sold: 89,
    age_limit: 21,
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-xtreme-bolly-03',
    venue_id: 'v-xtreme-001',
    venue_name: 'Club Xtreme, Tito\'s Lane, Goa',
    name: 'Bollywood Glamour & Commercial Night',
    description: 'The ultimate weekend anthem night packed with Bollywood club remixes, celebrity host appearances, and sparkler bottle shows.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
    category: 'Bollywood / Commercial',
    date: '2026-09-06',
    start_time: '21:30',
    end_time: '03:30',
    ticket_price: 1299,
    ticket_capacity: 500,
    tickets_sold: 210,
    age_limit: 18,
    published: true,
    created_at: new Date().toISOString(),
  }
];

let ORDERS_STORE: Order[] = [
  {
    id: 'ord-demo-001',
    customer_id: 'usr-001',
    customer_name: 'Rohan Mehta',
    customer_email: 'rohan@example.com',
    customer_phone: '+91 98200 11223',
    event_id: 'evt-xtreme-neon-01',
    source_code: 'XYZ-ARYAN',
    quantity: 2,
    ticket_type: 'General VIP Entry',
    subtotal: 2998,
    fees: 100,
    total: 3098,
    payment_status: 'PAID',
    razorpay_order_id: 'order_MOCK12345',
    razorpay_payment_id: 'pay_MOCK98765',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

let TICKETS_STORE: Ticket[] = [
  {
    id: 'tkt-demo-001',
    order_id: 'ord-demo-001',
    event_id: 'evt-xtreme-neon-01',
    event_name: 'Goa Neon Carnival - Friday Rave',
    venue_name: 'Club Xtreme, Tito\'s Lane, Goa',
    customer_id: 'usr-001',
    customer_name: 'Rohan Mehta',
    customer_email: 'rohan@example.com',
    customer_phone: '+91 98200 11223',
    source_code: 'XYZ-ARYAN',
    qr_token: 'NOX-XTREME-ROHAN-001',
    status: 'VALID',
    ticket_type: 'General VIP Entry',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'tkt-demo-002',
    order_id: 'ord-demo-001',
    event_id: 'evt-xtreme-neon-01',
    event_name: 'Goa Neon Carnival - Friday Rave',
    venue_name: 'Club Xtreme, Tito\'s Lane, Goa',
    customer_id: 'usr-001',
    customer_name: 'Rohan Mehta (Guest 2)',
    customer_email: 'rohan@example.com',
    customer_phone: '+91 98200 11223',
    source_code: 'XYZ-ARYAN',
    qr_token: 'NOX-XTREME-ROHAN-002',
    status: 'VALID',
    ticket_type: 'General VIP Entry',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

let SCANS_STORE: Scan[] = [];

// API STORE DATA METHODS
export async function getVenues(): Promise<Venue[]> {
  return [...VENUES_STORE];
}

export async function getVenueById(id: string): Promise<Venue | undefined> {
  return VENUES_STORE.find(v => v.id === id);
}

export async function addVenue(venueData: Omit<Venue, 'id' | 'created_at'>): Promise<Venue> {
  const newVenue: Venue = {
    ...venueData,
    id: `v-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  VENUES_STORE.unshift(newVenue);
  return newVenue;
}

export async function updateVenue(id: string, updateData: Partial<Venue>): Promise<Venue | undefined> {
  const index = VENUES_STORE.findIndex(v => v.id === id);
  if (index === -1) return undefined;
  VENUES_STORE[index] = { ...VENUES_STORE[index], ...updateData };
  return VENUES_STORE[index];
}

export async function getEvents(): Promise<Event[]> {
  return EVENTS_STORE.map(evt => {
    const v = VENUES_STORE.find(venue => venue.id === evt.venue_id);
    return {
      ...evt,
      venue_name: v ? `${v.name}, ${v.address}` : 'Club Xtreme, Tito\'s Lane, Goa'
    };
  });
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const evt = EVENTS_STORE.find(e => e.id === id);
  if (!evt) return undefined;
  const v = VENUES_STORE.find(venue => venue.id === evt.venue_id);
  return {
    ...evt,
    venue_name: v ? `${v.name}, ${v.address}` : 'Club Xtreme, Tito\'s Lane, Goa'
  };
}

export async function addEvent(eventData: Omit<Event, 'id' | 'created_at' | 'tickets_sold'>): Promise<Event> {
  const newEvent: Event = {
    ...eventData,
    id: `evt-${Date.now()}`,
    tickets_sold: 0,
    created_at: new Date().toISOString(),
  };
  EVENTS_STORE.unshift(newEvent);
  return newEvent;
}

export async function updateEvent(id: string, updateData: Partial<Event>): Promise<Event | undefined> {
  const index = EVENTS_STORE.findIndex(e => e.id === id);
  if (index === -1) return undefined;
  EVENTS_STORE[index] = { ...EVENTS_STORE[index], ...updateData };
  return EVENTS_STORE[index];
}

export async function getSources(): Promise<Source[]> {
  return [...SOURCES_STORE];
}

export async function addSource(sourceData: Omit<Source, 'id' | 'created_at'>): Promise<Source> {
  const newSource: Source = {
    ...sourceData,
    id: `src-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  SOURCES_STORE.unshift(newSource);
  return newSource;
}

// CREATE ORDER & TICKETS (Server verification)
export async function createOrderAndTickets(params: {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  event_id: string;
  source_code?: string;
  quantity: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
}): Promise<{ order: Order; tickets: Ticket[] }> {
  const event = await getEventById(params.event_id);
  if (!event) throw new Error('Event not found');

  const unitPrice = event.ticket_price;
  const subtotal = unitPrice * params.quantity;
  const fees = Math.round(subtotal * 0.03); // 3% platform / convenience fee
  const total = subtotal + fees;

  const orderId = `ord-${Date.now()}`;
  const newOrder: Order = {
    id: orderId,
    customer_name: params.customer_name,
    customer_email: params.customer_email,
    customer_phone: params.customer_phone,
    event_id: params.event_id,
    source_code: params.source_code || undefined,
    quantity: params.quantity,
    ticket_type: 'General VIP Entry',
    subtotal,
    fees,
    total,
    payment_status: 'PAID',
    razorpay_order_id: params.razorpay_order_id,
    razorpay_payment_id: params.razorpay_payment_id,
    created_at: new Date().toISOString(),
  };

  ORDERS_STORE.unshift(newOrder);

  // Update tickets sold count on event
  const evtIdx = EVENTS_STORE.findIndex(e => e.id === params.event_id);
  if (evtIdx !== -1) {
    EVENTS_STORE[evtIdx].tickets_sold += params.quantity;
  }

  const generatedTickets: Ticket[] = [];
  for (let i = 0; i < params.quantity; i++) {
    const ticketId = `tkt-${Date.now()}-${i + 1}`;
    const token = `NOX-${event.name.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${i + 1}`;
    
    const ticket: Ticket = {
      id: ticketId,
      order_id: orderId,
      event_id: params.event_id,
      event_name: event.name,
      venue_name: event.venue_name,
      customer_name: i === 0 ? params.customer_name : `${params.customer_name} (Guest ${i + 1})`,
      customer_email: params.customer_email,
      customer_phone: params.customer_phone,
      source_code: params.source_code || undefined,
      qr_token: token,
      status: 'VALID',
      ticket_type: 'General VIP Entry',
      created_at: new Date().toISOString(),
    };
    TICKETS_STORE.unshift(ticket);
    generatedTickets.push(ticket);
  }

  return { order: newOrder, tickets: generatedTickets };
}

export async function getTicketById(ticketIdOrToken: string): Promise<Ticket | undefined> {
  const ticket = TICKETS_STORE.find(t => t.id === ticketIdOrToken || t.qr_token === ticketIdOrToken);
  if (!ticket) return undefined;

  const event = await getEventById(ticket.event_id);
  return {
    ...ticket,
    event_name: event?.name || ticket.event_name,
    venue_name: event?.venue_name || ticket.venue_name,
  };
}

export async function getTickets(): Promise<Ticket[]> {
  return [...TICKETS_STORE];
}

export async function getOrders(): Promise<Order[]> {
  return [...ORDERS_STORE];
}

// QR ENTRY VALIDATION & SCANNING ENGINE
export async function validateAndScanTicket(qrTokenOrId: string, staffId: string = 'staff-001'): Promise<{
  result: 'VALID' | 'ALREADY_USED' | 'INVALID';
  ticket?: Ticket;
  message: string;
}> {
  const ticket = TICKETS_STORE.find(t => t.qr_token === qrTokenOrId || t.id === qrTokenOrId);
  
  if (!ticket) {
    return {
      result: 'INVALID',
      message: 'Ticket token not found in system database.',
    };
  }

  if (ticket.status === 'USED') {
    const scan: Scan = {
      id: `scn-${Date.now()}`,
      ticket_id: ticket.id,
      staff_id: staffId,
      venue_id: 'v-xtreme-001',
      event_id: ticket.event_id,
      scanned_at: new Date().toISOString(),
      result: 'ALREADY_USED',
    };
    SCANS_STORE.unshift(scan);

    return {
      result: 'ALREADY_USED',
      ticket,
      message: `Ticket was already scanned on ${ticket.scanned_at ? new Date(ticket.scanned_at).toLocaleTimeString() : 'earlier'}. Duplicate entry denied!`,
    };
  }

  if (ticket.status !== 'VALID') {
    return {
      result: 'INVALID',
      message: `Ticket is ${ticket.status}. Entry rejected.`,
    };
  }

  // MARK TICKET AS USED
  ticket.status = 'USED';
  ticket.scanned_at = new Date().toISOString();
  ticket.scanned_by = staffId;

  const scanRecord: Scan = {
    id: `scn-${Date.now()}`,
    ticket_id: ticket.id,
    staff_id: staffId,
    venue_id: 'v-xtreme-001',
    event_id: ticket.event_id,
    scanned_at: ticket.scanned_at,
    result: 'VALID',
  };
  SCANS_STORE.unshift(scanRecord);

  return {
    result: 'VALID',
    ticket,
    message: '✓ VALID TICKET - ENTRY GRANTED',
  };
}

export async function getScans(): Promise<Scan[]> {
  return [...SCANS_STORE];
}

// PROMOTER ATTRIBUTION CALCULATOR
export async function getPromoterAttributionReports(): Promise<PromoterAttributionReport[]> {
  const reportsMap: Record<string, PromoterAttributionReport> = {};

  // Register defined sources first
  for (const src of SOURCES_STORE) {
    const venue = VENUES_STORE.find(v => v.id === src.venue_id);
    reportsMap[src.code] = {
      source_code: src.code,
      promoter_name: src.name,
      venue_name: venue ? venue.name : 'Club Xtreme',
      tickets_sold: 0,
      gross_entry_revenue: 0,
      commission_percentage: src.commission_percentage,
      commission_payable: 0,
    };
  }

  // Sum up paid orders that have a source_code
  for (const order of ORDERS_STORE) {
    if (order.payment_status === 'PAID' && order.source_code) {
      const code = order.source_code;
      if (!reportsMap[code]) {
        reportsMap[code] = {
          source_code: code,
          promoter_name: `Promoter (${code})`,
          venue_name: 'Club Xtreme',
          tickets_sold: 0,
          gross_entry_revenue: 0,
          commission_percentage: 20.0,
          commission_payable: 0,
        };
      }

      // CRITICAL BUSINESS RULE: Commission calculated ONLY on entry subtotal (not taxes/fees)
      reportsMap[code].tickets_sold += order.quantity;
      reportsMap[code].gross_entry_revenue += order.subtotal;
    }
  }

  // Calculate final commission payable for each source
  return Object.values(reportsMap).map(rep => ({
    ...rep,
    commission_payable: Math.round(rep.gross_entry_revenue * (rep.commission_percentage / 100))
  }));
}

// SETTLEMENT REPORT GENERATOR (GROSS - COMMISSION = NET VENUE)
export async function getSettlementReports(): Promise<Settlement[]> {
  const settlements: Settlement[] = [];

  for (const evt of EVENTS_STORE) {
    const venue = VENUES_STORE.find(v => v.id === evt.venue_id);
    const commPct = venue ? venue.commission_percentage : 20.0;

    // Filter paid orders for this event
    const eventPaidOrders = ORDERS_STORE.filter(
      o => o.event_id === evt.id && o.payment_status === 'PAID'
    );

    const grossRevenue = eventPaidOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const refunds = 0;
    const eligibleRevenue = grossRevenue - refunds;
    const commissionAmount = Math.round(eligibleRevenue * (commPct / 100));
    const venueAmount = eligibleRevenue - commissionAmount;

    settlements.push({
      id: `stl-${evt.id}`,
      venue_id: evt.venue_id,
      venue_name: venue ? venue.name : 'Club Xtreme',
      event_id: evt.id,
      event_name: evt.name,
      gross_revenue: grossRevenue,
      refunds,
      eligible_revenue: eligibleRevenue,
      commission_percentage: commPct,
      commission_amount: commissionAmount,
      venue_amount: venueAmount,
      status: grossRevenue > 0 ? 'SETTLED' : 'PENDING',
      created_at: new Date().toISOString(),
    });
  }

  return settlements;
}

// ADMIN ANALYTICS METRICS
export async function getAdminAnalytics() {
  const paidOrders = ORDERS_STORE.filter(o => o.payment_status === 'PAID');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const totalTicketsSold = TICKETS_STORE.length;
  const totalTicketsUsed = TICKETS_STORE.filter(t => t.status === 'USED').length;
  const attendanceRate = totalTicketsSold > 0 ? Math.round((totalTicketsUsed / totalTicketsSold) * 100) : 0;
  const totalCommission = Math.round(totalRevenue * 0.20); // 20% platform cut

  return {
    todaySales: paidOrders.length,
    ticketsSold: totalTicketsSold,
    revenue: totalRevenue,
    ticketsUsed: totalTicketsUsed,
    attendanceRate,
    commissionEarned: totalCommission,
    refunds: 0,
  };
}
