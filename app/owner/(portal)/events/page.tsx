import {Suspense} from 'react';
import OwnerEventsList from '@/components/owner/OwnerEventsList';
import {getOwnerVenueData} from '@/lib/owner-data';

export const dynamic = 'force-dynamic';

export default async function OwnerEvents({searchParams}:{searchParams:Promise<{venue?:string;status?:string}>}) {
  const {venue}=await searchParams;
  const data=await getOwnerVenueData(venue);
  const metrics=Object.fromEntries(data.events.map(event=>{
    const paid=data.orders.filter(order=>order.event_id===event.id&&order.payment_status==='PAID');
    const ids=new Set(paid.map(order=>order.id));
    return [event.id,{sold:paid.reduce((sum,order)=>sum+Number(order.quantity),0),revenue:paid.reduce((sum,order)=>sum+Number(order.subtotal),0),checkins:data.tickets.filter(ticket=>ids.has(ticket.order_id)&&ticket.status==='USED').length}];
  }));
  return <Suspense fallback={<p role="status" className="text-sm text-zinc-400">Loading venue events...</p>}>
    <OwnerEventsList key={data.venue.id} venueId={data.venue.id} events={data.events} metrics={metrics} initialNow={Date.now()}/>
  </Suspense>;
}
