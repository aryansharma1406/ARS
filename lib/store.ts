'use server';

import { dbError } from './api';
import { promoterCommission } from './promoter-commission';
import { AuthError,requireAdmin,requireAuth,requireOwner,requireRole,requireStaff,requireVenueAccess } from './auth';
import { getSupabaseClient } from './supabase';
import type { AuditLog,Event,Order,PromoterAttributionReport,Scan,Settlement,Source,Ticket,UserRole,Venue,VenueStaffAssignment } from './types';

// Client imports become Next server actions; every non-public entry point checks authorization.
const venueColumns = 'id,name,location,address,description,image,active,created_at';
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = await getSupabaseClient();
  const { data, error } = await client.rpc(name, args);
  dbError(error);
  return data as T;
}
async function businessAccess(venueId?: string) {
  const auth = await requireRole('venue_owner', 'admin', 'super_admin');
  if (auth.role === 'venue_owner') {
    const owner = await requireOwner();
    if (venueId && !owner.venueIds.includes(venueId)) throw new AuthError(403, 'Venue access denied.');
    return { ...auth, venueIds: venueId ? [venueId] : owner.venueIds };
  }
  return { ...auth, venueIds: venueId ? [venueId] : undefined };
}
async function eventIdsForVenues(client: Awaited<ReturnType<typeof getSupabaseClient>>, venueIds: string[]) {
  const { data, error } = await client.from('events').select('id').in('venue_id', venueIds);
  dbError(error);
  return (data || []).map(row => row.id as string);
}

export async function getVenues(): Promise<Venue[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client.from('venues').select(venueColumns);
  dbError(error);
  // Public catalog callers never receive commercial terms. Business reads use getBusinessVenues.
  return (data || []) as Venue[];
}
export async function getBusinessVenues(venueId?: string): Promise<Venue[]> {
  await businessAccess(venueId);
  return rpc('business_venues', { target_venue: venueId || null });
}
export async function getVenueById(id: string): Promise<Venue | undefined> {
  return (await getVenues()).find(v => v.id === id);
}
export async function getEvents(venueId?: string): Promise<Event[]> {
  const client = await getSupabaseClient();
  if (venueId) await businessAccess(venueId);
  let query = client.from('events').select('*,venues(name,address)');
  if (venueId) query = query.eq('venue_id', venueId);
  const { data, error } = await query;
  dbError(error);
  return (data || []).map(({ venues, ...event }) => ({ ...event, venue_name: venues ? `${venues.name}, ${venues.address}` : '' })) as Event[];
}
export async function getEventById(id: string): Promise<Event | undefined> {
  const client = await getSupabaseClient();
  const { data, error } = await client.from('events').select('*,venues(name,address)').eq('id', id).maybeSingle();
  dbError(error);
  if (!data) return undefined;
  const { venues, ...event } = data;
  return { ...event, venue_name: venues ? `${venues.name}, ${venues.address}` : '' } as Event;
}
export async function addVenue(payload: Omit<Venue,'id'|'created_at'>): Promise<Venue> {
  await requireAdmin(); return rpc('save_venue', { payload });
}
export async function updateVenue(id: string, payload: Partial<Venue>): Promise<Venue> {
  const auth = await requireRole('venue_owner','admin','super_admin');
  if (auth.role === 'venue_owner') await requireVenueAccess(id);
  return rpc('save_venue', { payload, target_id: id });
}
export async function addEvent(payload: Omit<Event,'id'|'created_at'|'tickets_sold'>): Promise<Event> {
  await businessAccess(payload.venue_id); return rpc(payload.tiers ? 'save_event_with_tiers' : 'save_event', { payload });
}
export async function updateEvent(id: string, payload: Partial<Event>, venueId?: string): Promise<Event> {
  await businessAccess(venueId); return rpc(payload.tiers ? 'save_event_with_tiers' : 'save_event', { payload, target_id: id, target_venue: venueId || null });
}
export async function getSources(venueId?: string): Promise<Source[]> {
  const auth = await businessAccess(venueId);
  let query = auth.client.from('sources').select('*');
  if (auth.venueIds) query = query.in('venue_id', auth.venueIds);
  const { data, error } = await query; dbError(error); return (data || []) as Source[];
}
export async function addSource(payload: Omit<Source,'id'|'created_at'>): Promise<Source> {
  await requireAdmin(); return rpc('admin_create_source', { payload });
}
export async function getOrders(venueId?: string): Promise<Order[]> {
  const auth = await businessAccess(venueId);
  let query = auth.client.from('orders').select('*');
  if (auth.venueIds) query = query.in('event_id', await eventIdsForVenues(auth.client, auth.venueIds));
  const { data, error } = await query; dbError(error); return (data || []) as Order[];
}
export async function getTickets(venueId?: string): Promise<Ticket[]> {
  const auth = await businessAccess(venueId);
  let query = auth.client.from('tickets').select('*,events(name,venues(name))');
  if (auth.venueIds) query = query.in('event_id', await eventIdsForVenues(auth.client, auth.venueIds));
  const { data, error } = await query; dbError(error);
  return (data || []).map(({ events, ...ticket }) => ({ ...ticket, event_name: events?.name, venue_name: events?.venues?.name })) as Ticket[];
}
export async function getCustomerTickets(auth?: Awaited<ReturnType<typeof requireRole>>): Promise<Ticket[]> {
  const customer = auth || await requireRole('customer');
  const { data, error } = await customer.client.from('tickets').select('*').eq('customer_id', customer.userId).order('created_at', { ascending: false });
  dbError(error); return (data || []) as Ticket[];
}
export async function getTicketById(id: string): Promise<Ticket> {
  const auth = await requireRole('customer','admin','super_admin');
  let query = auth.client.from('tickets').select('*,events(name,venues(name))').eq('id', id);
  if (auth.role === 'customer') query = query.eq('customer_id', auth.userId);
  const { data, error } = await query.maybeSingle();
  dbError(error);
  if (!data) throw new AuthError(403, 'Ticket access denied.');
  const { events, ...ticket } = data;
  return { ...ticket, event_name: events?.name, venue_name: events?.venues?.name } as Ticket;
}
export async function getScans(venueId?: string): Promise<Scan[]> {
  const auth = await requireAuth();
  let query = auth.client.from('scans').select('*');
  if (auth.role === 'staff') {
    await requireStaff(); query = query.eq('staff_id', auth.userId);
  } else {
    const business = await businessAccess(venueId);
    if (business.venueIds) query = query.in('venue_id', business.venueIds);
  }
  const { data, error } = await query; dbError(error); return (data || []) as Scan[];
}
export async function getAuditLogs(venueId?: string): Promise<AuditLog[]> {
  const auth = await businessAccess(venueId);
  let query = auth.client.from('audit_logs').select('*');
  if (auth.venueIds) query = query.in('venue_id', auth.venueIds);
  const { data, error } = await query.order('created_at', { ascending: false }); dbError(error); return (data || []) as AuditLog[];
}
export async function getVenueStaffAssignments(venueId: string): Promise<VenueStaffAssignment[]> {
  const auth = await businessAccess(venueId);
  const { data, error } = await auth.client.from('venue_staff_assignments').select('*').eq('venue_id', venueId);
  dbError(error); return (data || []) as VenueStaffAssignment[];
}
export async function addVenueStaffAssignment(payload: Omit<VenueStaffAssignment,'id'|'created_at'>): Promise<VenueStaffAssignment> {
  await businessAccess(payload.venue_id); return rpc('save_staff_assignment', { payload });
}
export async function updateVenueStaffAssignment(id: string, payload: Partial<VenueStaffAssignment>, venueId?: string): Promise<VenueStaffAssignment> {
  await businessAccess(venueId); return rpc('save_staff_assignment', { payload, target_id: id, target_venue: venueId || null });
}
export async function getOwnerNotificationPreferences(userId: string) {
  const auth = await requireOwner();
  if (userId !== auth.userId) throw new AuthError(403, 'Account access denied.');
  const { data, error } = await auth.client.from('owner_notification_preferences').select('*').eq('user_id', auth.userId).maybeSingle();
  dbError(error);
  return data ? { email: data.email_notifications as boolean, sales: data.sales_notifications as boolean, settlements: data.settlement_notifications as boolean, events: data.event_notifications as boolean } : { email: true, sales: true, settlements: true, events: true };
}
export async function updateOwnerNotificationPreferences(userId: string, payload: {email:boolean;sales:boolean;settlements:boolean;events:boolean}) {
  const owner = await requireOwner();
  if (owner.userId !== userId) throw new AuthError(403, 'Account access denied.');
  await rpc('save_preferences', { payload }); return payload;
}
export async function validateAndScanTicket(token: string, assignmentId: string): Promise<{result:'VALID'|'ALREADY_USED'|'INVALID';ticket?:Ticket;message:string}> {
  const staff = await requireStaff();
  if (!staff.assignments.some(a => a.id === assignmentId)) throw new AuthError(403, 'Scanner assignment access denied.');
  return rpc('scan_ticket', { token, assignment_id: assignmentId });
}
export async function getPromoterAttributionReports(venueId?: string): Promise<PromoterAttributionReport[]> {
  await businessAccess(venueId);
  const [sources, orders, venues] = await Promise.all([getSources(venueId), getOrders(venueId), getBusinessVenues(venueId)]);
  return sources.map(source => {
    const paid = orders.filter(o => o.payment_status === 'PAID' && o.source_code === source.code);
    const gross = paid.reduce((n,o) => n + Number(o.subtotal),0);
    return { source_code:source.code,promoter_name:source.name,venue_name:venues.find(v=>v.id===source.venue_id)?.name || '',tickets_sold:paid.reduce((n,o)=>n+o.quantity,0),gross_entry_revenue:gross,commission_percentage:Number(source.commission_percentage),commission_payable:promoterCommission(paid, Number(source.commission_percentage)) };
  });
}
export async function getSettlementReports(venueId?: string): Promise<Settlement[]> {
  const auth = await businessAccess(venueId);
  const [orders, venues, allEvents] = await Promise.all([getOrders(venueId),getBusinessVenues(venueId),getEvents(venueId)]);
  let query = auth.client.from('settlements').select('*');
  if (auth.venueIds) query = query.in('venue_id', auth.venueIds);
  const { data: saved, error } = await query; dbError(error);
  return allEvents.filter(event => venues.some(v=>v.id===event.venue_id)).map(event => {
    const venue = venues.find(v=>v.id===event.venue_id)!;
    const persisted = saved?.find(row=>row.event_id===event.id);
    if (persisted) return {...persisted,venue_name:venue.name,event_name:event.name} as Settlement;
    // Preserve the existing subtotal-only calculation. Unsaved figures are estimates, never settled payouts.
    const paid=orders.filter(o=>o.event_id===event.id&&o.payment_status==='PAID');
    const gross=paid.reduce((n,o)=>n+Number(o.subtotal),0);
    const commission=Math.round(gross*Number(venue.commission_percentage)/100);
    return {id:`estimate-${event.id}`,venue_id:venue.id,venue_name:venue.name,event_id:event.id,event_name:event.name,gross_revenue:gross,refunds:0,eligible_revenue:gross,commission_percentage:Number(venue.commission_percentage),commission_amount:commission,venue_amount:gross-commission,status:'PENDING',created_at:event.created_at};
  });
}
export async function getAdminAnalytics() {
  await requireAdmin();
  const [orders,tickets,settlements] = await Promise.all([getOrders(),getTickets(),getSettlementReports()]);
  const paid=orders.filter(o=>o.payment_status==='PAID'); const used=tickets.filter(t=>t.status==='USED').length;
  return {todaySales:paid.length,ticketsSold:tickets.length,revenue:paid.reduce((n,o)=>n+Number(o.subtotal),0),ticketsUsed:used,attendanceRate:tickets.length?Math.round(used/tickets.length*100):0,commissionEarned:settlements.reduce((n,s)=>n+Number(s.commission_amount),0),refunds:0};
}
export async function setUserAccess(userId:string, role:UserRole, active:boolean) {
  await requireAdmin(); await rpc('admin_set_user_access', {target_user:userId,new_role:role,is_active:active});
}
export async function assignVenueOwner(userId:string, venueId:string, active:boolean) {
  await requireAdmin(); await rpc('admin_assign_owner', {target_user:userId,target_venue:venueId,is_active:active});
}
