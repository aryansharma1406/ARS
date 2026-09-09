import { requireOwner } from '@/lib/owner-auth';
import { getBusinessVenues,getEvents,getOrders,getPromoterAttributionReports,getScans,getSettlementReports,getSources,getTickets } from '@/lib/store';
import type { Event,Order,Scan,Settlement,Source,Ticket,Venue } from '@/lib/types';
import { forbidden } from 'next/navigation';
import 'server-only';

export type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | '7D' | '30D' | {from:string;to:string};

export interface OwnerVenueData {
  venue: Venue;
  venues: Venue[];
  events: Event[];
  orders: Order[];
  tickets: Ticket[];
  sources: Source[];
  scans: Scan[];
  settlements: Settlement[];
  owner: Awaited<ReturnType<typeof requireOwner>>;
}

export interface OwnerTicketHistoryRow {
  event: string;
  date: string;
  amount: number;
  orderId: string;
  ticketType: string;
}

export interface OwnerCustomerRow {
  name:string;
  email:string;
  phone:string;
  visits:number;
  tickets:number;
  spent:number;
  lastVisit:string;
  used:number;
  eventsAttended:number;
  averageSpend:number;
  purchaseHistory: OwnerTicketHistoryRow[];
  attendanceHistory: OwnerTicketHistoryRow[];
}

export async function getOwnerVenueData(requestedVenueId?: string): Promise<OwnerVenueData> {
  const owner = await requireOwner();
  const allVenues = await getBusinessVenues();
  const venues = allVenues.filter(v => owner.venueIds.includes(v.id));
  if (!venues.length) forbidden();
  const venue = venues.find(v => v.id === requestedVenueId) || venues[0];
  if (requestedVenueId && !owner.venueIds.includes(requestedVenueId)) forbidden();

  const allEvents = await getEvents(venue.id);
  const events = allEvents.filter(e => e.venue_id === venue.id);
  const eventIds = new Set(events.map(e => e.id));
  const [allOrders, allTickets, allSources, allScans, allSettlements] = await Promise.all([
    getOrders(venue.id),
    getTickets(venue.id),
    getSources(venue.id),
    getScans(venue.id),
    getSettlementReports(venue.id),
  ]);

  return {
    owner,
    venue,
    venues,
    events,
    orders: allOrders.filter(o => eventIds.has(o.event_id)),
    tickets: allTickets.filter(t => eventIds.has(t.event_id)),
    sources: allSources.filter(s => s.venue_id === venue.id),
    scans: allScans.filter(s => s.venue_id === venue.id || eventIds.has(s.event_id)),
    settlements: allSettlements.filter(s => s.venue_id === venue.id),
  };
}

export async function getOwnerEvent(eventId: string, venueId?: string) {
  const data = await getOwnerVenueData(venueId);
  const event = data.events.find(e => e.id === eventId);
  if (!event) forbidden();
  return {
    ...data,
    event,
    orders: data.orders.filter(o => o.event_id === eventId),
    tickets: data.tickets.filter(t => t.event_id === eventId),
    settlements: data.settlements.filter(s => s.event_id === eventId),
  };
}

export function resolveDateRange(range: DateFilter, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (typeof range !== 'string') {
    const from = new Date(range.from);
    const to = new Date(range.to);
    return { from, to: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) };
  }

  if (range === 'TODAY') return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
  if (range === 'YESTERDAY') return { from: new Date(today.getTime() - 24 * 60 * 60 * 1000), to: new Date(today.getTime() - 1) };
  if (range === '7D') return { from: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), to: now };
  if (range === '30D') return { from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000), to: now };
  return { from: new Date(0), to: now };
}

export function filterOrdersByRange(orders: Order[], range: DateFilter = 'ALL', now = new Date()) {
  if (range === 'ALL') return orders;
  const window = resolveDateRange(range, now);
  const from = window.from.getTime();
  const to = window.to.getTime();
  return orders.filter(order => {
    const created = new Date(order.created_at).getTime();
    return created >= from && created <= to;
  });
}

export function bucketByHour(values: Order[], selector: (order: Order) => number) {
  const hourBuckets = Array.from({ length: 24 }, () => 0);
  for (const order of values) {
    const index = selector(order);
    if (index >= 0 && index < hourBuckets.length) hourBuckets[index] += Number(order.subtotal);
  }
  const max = Math.max(...hourBuckets);
  return {
    max: Math.max(1, max),
    values: hourBuckets,
  };
}

export function bucketByDay(orders: Order[], now = new Date(), days = 7, range: DateFilter = '7D') {
  const safeRange = filterOrdersByRange(orders, range, now);
  const daysBack = Array.from({ length: days }, () => 0);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (const order of safeRange) {
    const dayDate = new Date(order.created_at);
    const dayIndex = Math.max(
      0,
      Math.min(days - 1, Math.floor((dayDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))),
    );
    if (dayIndex >= 0 && dayIndex < days) daysBack[dayIndex] += Number(order.subtotal);
  }

  return {
    values: daysBack,
    max: Math.max(1, ...daysBack),
    labels: Array.from({ length: days }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return `${day.getDate()}/${day.getMonth() + 1}`;
    }),
  };
}

export function ownerMetrics(data: OwnerVenueData, range: DateFilter = 'ALL', now = new Date()) {
  const paid = filterOrdersByRange(data.orders, range, now).filter(o => o.payment_status === 'PAID');
  const filteredTickets = data.tickets.filter(t => paid.some(order => order.id === t.order_id));
  const gross = paid.reduce((sum, o) => sum + o.subtotal, 0);
  const refunds = filterOrdersByRange(data.orders, range, now).filter(o => o.payment_status === 'REFUNDED').reduce((sum, o) => sum + o.subtotal, 0);
  const eligible = gross - refunds;
  const commission = Math.round(eligible * (data.venue.commission_percentage / 100));
  const used = filteredTickets.filter(t => t.status === 'USED').length;
  const sold = paid.reduce((sum, o) => sum + o.quantity, 0);
  const todayFilter = resolveDateRange('TODAY', now);
  const today = todayFilter.from.getTime();
  const todayTo = todayFilter.to.getTime();
  const todayRevenue = paid.filter(order => {
    const created = new Date(order.created_at).getTime();
    return created >= today && created <= todayTo;
  }).reduce((s, o) => s + o.subtotal, 0);
  const upcoming = data.events.filter(e => new Date(`${e.date}T${e.start_time}`) > now);
  const active = data.events.filter(e => e.published && new Date(`${e.date}T${e.end_time}`) >= now);

  return {
    gross,
    refunds,
    eligible,
    commission,
    venuePayable: Math.max(0, eligible - commission),
    sold,
    used,
    remaining: data.events.reduce((sum, e) => sum + Math.max(0, e.ticket_capacity - e.tickets_sold), 0),
    attendance: sold ? Math.round(used / sold * 100) : 0,
    todayRevenue,
    weekRevenue: paid.reduce((sum, o) => sum + o.subtotal, 0),
    monthRevenue: gross,
    upcoming: upcoming.length,
    active: active.length,
    completed: data.events.length - active.length,
  };
}

export function customersForVenue(data: OwnerVenueData, range: DateFilter = 'ALL', now = new Date()) {
  const paidOrders = filterOrdersByRange(data.orders, range, now).filter(order => order.payment_status === 'PAID');
  const paidTickets = data.tickets.filter(ticket => paidOrders.some(order => order.id === ticket.order_id));
  const eventAttendance = new Map<string, Set<string>>();

  paidTickets.forEach(ticket => {
    const key = ticket.customer_email.toLowerCase();
    if (!eventAttendance.has(key)) eventAttendance.set(key, new Set());
    if (ticket.event_id) eventAttendance.get(key)?.add(ticket.event_id);
  });

  const map = new Map<string, {
    name:string;
    email:string;
    phone:string;
    visits:number;
    tickets:number;
    spent:number;
    lastVisit:string;
    used:number;
    eventsAttended:number;
    averageSpend:number;
    purchaseHistory: OwnerTicketHistoryRow[];
    attendanceHistory: OwnerTicketHistoryRow[];
  }>();

  paidOrders.forEach(order => {
    const key = order.customer_email.toLowerCase();
    const row = map.get(key) || {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      visits: 0,
      tickets: 0,
      spent: 0,
      lastVisit: order.created_at,
      used: 0,
      eventsAttended: 0,
      averageSpend: 0,
      purchaseHistory: [],
      attendanceHistory: [],
    };

    row.visits += 1;
    row.tickets += order.quantity;
    row.spent += order.subtotal;
    if (order.created_at > row.lastVisit) row.lastVisit = order.created_at;
    row.averageSpend = row.tickets ? row.spent / row.tickets : 0;
    row.eventsAttended = eventAttendance.get(key)?.size || 0;
    map.set(key, row);
  });

  paidTickets.filter(t => t.status === 'USED').forEach(ticket => {
    const row = map.get(ticket.customer_email.toLowerCase());
    if (!row) return;
    row.used += 1;
  });

  paidTickets.forEach(ticket => {
    const order = paidOrders.find(order => order.id === ticket.order_id);
    if (!order) return;
    const customer = map.get(ticket.customer_email.toLowerCase());
    if (!customer) return;

    const row = {
      event: ticket.event_name || 'Unknown event',
      date: order.created_at,
      amount: order.subtotal / order.quantity,
      orderId: order.id,
      ticketType: ticket.ticket_type,
    };

    customer.purchaseHistory.push(row);
    if (ticket.status === 'USED') customer.attendanceHistory.push(row);
  });

  return [...map.values()].sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
}

export async function promoterRows(data: OwnerVenueData) {
  const reports = await getPromoterAttributionReports(data.venue.id);
  return reports
    .filter(r => data.sources.some(s => s.code === r.source_code))
    .map(r => ({
      ...r,
      entries: data.tickets.filter(t => t.source_code === r.source_code && t.status === 'USED').length,
      conversion: r.tickets_sold
        ? Math.round(data.tickets.filter(t => t.source_code === r.source_code && t.status === 'USED').length / r.tickets_sold * 100)
        : 0,
    }));
}
