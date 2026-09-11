import 'server-only';
import { eventWindow } from '@/lib/event-schedule';
import type { OwnerVenueData } from '@/lib/owner-data';
export const money = (value: number) => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:2}).format(value);
export const stamp = (value?: string | null) => value ? new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'}) + ' IST' : 'Not recorded';
export function operatingNight(data: OwnerVenueData, now = Date.now()) {
  const local = new Date(now + 330 * 60000);
  const start = Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),12) - 330 * 60000 - (local.getUTCHours() < 12 ? 86400000 : 0);
  const end = start + 86400000;
  const events = data.events.filter(event => {
    const window = eventWindow(event);
    return event.published && ((window.start >= start && window.start < end) || (window.start <= now && window.end > now));
  });
  const ids = new Set(events.map(event => event.id));
  return {start,end,events,orders:data.orders.filter(order => ids.has(order.event_id)),tickets:data.tickets.filter(ticket => ids.has(ticket.event_id)),scans:data.scans.filter(scan => ids.has(scan.event_id) && Date.parse(scan.scanned_at)>=start && Date.parse(scan.scanned_at)<end)};
}
