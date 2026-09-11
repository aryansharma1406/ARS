import { getOwnerVenueData } from '@/lib/owner-data';
import { operatingNight, stamp } from '@/lib/owner-operations';
import { PageHeader } from '@/components/owner/OwnerUI';
import OperatingReport from '@/components/owner/OperatingReport';
import OperationsRefresh from '@/components/owner/OperationsRefresh';
import Link from 'next/link';
export default async function Guests({searchParams}:{searchParams:Promise<{venue?:string;segment?:string;event?:string}>}) {
  const q=await searchParams;
  const data=await getOwnerVenueData(q.venue);
  const night=operatingNight(data);
  const events=q.event ? data.events.filter(event=>event.id===q.event) : night.events;
  const selected=new Set(events.map(event=>event.id));
  const tickets=data.tickets.filter(ticket=>selected.has(ticket.event_id));
  const rows=tickets.filter(ticket=>{
    const order=data.orders.find(order=>order.id===ticket.order_id);
    if(q.segment==='vip') return /\bvip\b/i.test(ticket.ticket_type);
    if(q.segment==='complimentary') return /complimentary|\bcomp\b/i.test(ticket.ticket_type);
    if(q.segment==='promoter') return Boolean(ticket.source_code);
    if(q.segment==='paid') return order?.payment_status==='PAID' && Number(order.total)>0;
    if(q.segment==='used') return ticket.status==='USED';
    return true;
  }).map(ticket=>{const order=data.orders.find(order=>order.id===ticket.order_id);return [ticket.customer_name,ticket.customer_email,ticket.customer_phone,ticket.event_name||'Event',ticket.ticket_type,ticket.source_code||'Direct',ticket.status,stamp(ticket.scanned_at),order?.payment_status||'Not recorded',order?.razorpay_payment_id?.startsWith('test_payment_')?'TEST / no money collected':'',ticket.order_id,ticket.id];});
  return <><PageHeader eyebrow="Door concierge" title="Guest list" description="Tonight's issued passes and live entry status. One row per pass, not necessarily one unique person."/><OperationsRefresh/><div className="mb-5 flex flex-wrap gap-2">{['all','vip','complimentary','promoter','paid','used'].map(segment=><Link key={segment} href={`/owner/guests?venue=${data.venue.id}&segment=${segment}${q.event?`&event=${encodeURIComponent(q.event)}`:''}`} className={`ars-button ${q.segment===segment?'':'ars-button-secondary'}`}>{segment}</Link>)}</div><form className="mb-5 flex flex-wrap gap-3"><input type="hidden" name="venue" value={data.venue.id}/><input type="hidden" name="segment" value={q.segment||'all'}/><select aria-label="Guest list event" name="event" defaultValue={q.event||''} className="ars-select"><option value="">Tonight / operating night</option>{data.events.map(event=><option key={event.id} value={event.id}>{event.name} / {event.date}</option>)}</select><button className="ars-button">Choose event</button></form><p className="mb-5 text-xs text-zinc-500">VIP and complimentary categories use recorded ticket-tier labels. No complimentary passes are issued here; existing payment and QR rules still apply.</p><OperatingReport title="Guest passes" columns={['Guest','Email','Phone','Event','Tier','Promoter','Entry status','Check-in time','Payment','Mode','Booking ID','Pass ID']} rows={rows}/></>;
}
