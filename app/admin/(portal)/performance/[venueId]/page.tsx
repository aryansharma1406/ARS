import {Suspense} from 'react';
import VenueAnalyticsRanges,{VenueAnalyticsRangeButtons} from '@/components/admin/VenueAnalyticsRanges';
import {requireAdmin} from '@/lib/auth';
import {dbError} from '@/lib/api';
import {getAdminPerformanceData,venuePerformance,performanceMoney} from '@/lib/admin-performance';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Panel,Stat} from '@/components/owner/OwnerUI';
import OperatingReport from '@/components/owner/OperatingReport';
import AnalyticsChart from '@/components/owner/AnalyticsChart';
export default async function VenueAnalytics({params}:{params:Promise<{venueId:string}>;searchParams:Promise<{days?:string}>}) {
  const {venueId}=await params;
  const data=await getAdminPerformanceData();
  const venue=data.venues.find(venue=>venue.id===venueId);if(!venue) notFound();
  const now=Date.now();const cohort=venuePerformance(data,venueId,90,now);
  const customers=[...new Set(cohort.orders.map(order=>order.customer_id).filter(Boolean))];
  const customerNames=new Map<string,string>();
  if(customers.length){
    const {client}=await requireAdmin();
    for(let offset=0;offset<customers.length;offset+=200){
      const result=await client.from('users').select('id,name').in('id',customers.slice(offset,offset+200));
      dbError(result.error);
      for(const customer of result.data||[])customerNames.set(customer.id,customer.name?.trim()||'Name not recorded');
    }
  }

  function renderRange(days:number, venue: NonNullable<typeof data.venues[number]>){
  const r=venuePerformance(data,venueId,days,now);
  const start=now-days*86400000;
  const revenue=Array.from({length:days},(_,i)=>r.orders.filter(order=>Date.parse(order.created_at)>=start+i*86400000&&Date.parse(order.created_at)<start+(i+1)*86400000).reduce((sum,order)=>sum+Number(order.subtotal),0));
  const labels=Array.from({length:days},(_,i)=>new Date(start+(i+1)*86400000).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short'}));
  const customers=[...new Set(r.orders.map(order=>order.customer_id).filter(Boolean))];
  const sources=[...new Set(r.orders.map(order=>order.source_code||'Direct'))];
  const tiers=[...new Set(r.tickets.map(ticket=>ticket.ticket_type))];
  const events=r.events.map(event=>{const orders=r.orders.filter(order=>order.event_id===event.id);return {event,orders,revenue:orders.reduce((sum,order)=>sum+Number(order.subtotal),0)};}).sort((a,b)=>b.revenue-a.revenue);
  return <div className="space-y-6"><Link href={`/admin/performance?days=${days}`} className="editorial-link">Back to venue performance</Link><header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6"><div><p className="eyebrow">ARS / Venue intelligence</p><h1 className="mt-3 text-4xl font-bold">{venue.name}</h1><p className="mt-3 text-sm text-zinc-400">{venue.location} / {venue.active?'Active venue':'Inactive venue'}</p></div><VenueAnalyticsRangeButtons/></header>
    <p className="text-xs leading-6 text-zinc-500">Paid bookings created in the last {days} rolling days. Revenue is after discounts, before fees. Check-ins and repeat attendees refer to these bookings, not all scans during the period. {r.testOrders} test orders included; these did not collect money.</p>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat label="Net ticket revenue" value={performanceMoney(r.revenue)} accent/><Stat label="Tickets sold" value={r.sold}/><Stat label="Attendance" value={r.attendance===null?'No sales':`${r.attendance.toFixed(1)}%`}/><Stat label="Revenue growth" value={r.growth===null?'No baseline':`${r.growth.toFixed(1)}%`} note={`Previous ${days} days: ${performanceMoney(r.priorRevenue)}`}/><Stat label="Purchasing customers" value={r.customers}/><Stat label="Average ticket value" value={performanceMoney(r.average)}/><Stat label="Repeat attendees" value={r.repeatCustomers} note="Accounts checked in at two or more distinct events in this booking cohort."/><Stat label="Checked-in passes" value={r.used.length}/></div>
    <Panel title="Revenue trajectory"><AnalyticsChart kind="revenue" values={revenue} labels={labels}/><p className="mt-3 text-xs text-zinc-500">Rolling 24-hour buckets ending on each labelled date in IST, not calendar-day totals.</p></Panel>
    <OperatingReport title="Events / ranked by revenue" columns={['Event','Event date','Publication','Paid orders','Tickets','Check-ins','Revenue']} rows={events.map(({event,orders,revenue})=>[event.name,event.date,event.published?'Published':'Draft',String(orders.length),String(orders.reduce((sum,order)=>sum+Number(order.quantity),0)),String(r.used.filter(ticket=>ticket.event_id===event.id).length),performanceMoney(revenue)])}/>
    <OperatingReport title="Ticket tiers" columns={['Tier','Issued passes','Used passes','Allocated net revenue']} rows={tiers.map(tier=>{const tickets=r.tickets.filter(ticket=>ticket.ticket_type===tier);return [tier,String(tickets.length),String(tickets.filter(ticket=>ticket.status==='USED').length),performanceMoney(tickets.reduce((sum,ticket)=>{const order=r.orders.find(order=>order.id===ticket.order_id);return sum+(order?Number(order.subtotal)/Math.max(1,Number(order.quantity)):0);},0))];})}/>
    <OperatingReport title="Customer cohorts" columns={['Customer name','Customer account ID','Paid bookings','Tickets','Net spend','Events checked in','Last check-in']} rows={customers.map(id=>{const orders=r.orders.filter(order=>order.customer_id===id);const ids=new Set(orders.map(order=>order.id));const used=r.used.filter(ticket=>ids.has(ticket.order_id));const last=used.map(ticket=>ticket.scanned_at||'').sort().at(-1);return [customerNames.get(id)||'Name not recorded',id,String(orders.length),String(orders.reduce((sum,order)=>sum+Number(order.quantity),0)),performanceMoney(orders.reduce((sum,order)=>sum+Number(order.subtotal),0)),String(new Set(used.map(ticket=>ticket.event_id)).size),last?new Date(last).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'No check-in recorded'];})}/>
    <OperatingReport title="Promoters and purchase sources" columns={['Source','Promoter','Paid orders','Tickets','Check-ins','Net revenue']} rows={sources.map(code=>{const orders=r.orders.filter(order=>(order.source_code||'Direct')===code);const ids=new Set(orders.map(order=>order.id));return [code,data.sources.find(source=>source.venue_id===venueId&&source.code===code)?.name||(code==='Direct'?'Direct / no promoter':'Historical source'),String(orders.length),String(orders.reduce((sum,order)=>sum+Number(order.quantity),0)),String(r.used.filter(ticket=>ids.has(ticket.order_id)).length),performanceMoney(orders.reduce((sum,order)=>sum+Number(order.subtotal),0))];})}/>
    <div className="grid gap-6 lg:grid-cols-2"><Panel title="Website traffic"><p className="text-sm leading-6 text-zinc-400">The source report above measures paid-order attribution, not website visits. The existing funnel-report function is owner-scoped; this admin report does not bypass it or change database permissions. Network traffic and funnel conversion are unavailable here.</p></Panel><Panel title="Customer city distribution"><p className="text-sm leading-6 text-zinc-400">Not tracked. Customer cities are not recorded. The venue location is not used to infer where customers live.</p></Panel></div>
    <Link href={`/admin/compare?venue=${venue.id}&days=${days}`} className="ars-button ars-button-secondary">Compare with other venues</Link>
  </div>;
  }
  return <Suspense fallback={<p role="status" className="text-sm text-zinc-400">Loading venue analytics...</p>}>
    <VenueAnalyticsRanges key={venueId} panels={{7:renderRange(7,venue),30:renderRange(30,venue),90:renderRange(90,venue)}}/>
  </Suspense>;
}
