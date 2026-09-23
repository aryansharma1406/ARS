import {notFound} from 'next/navigation';
import {requirePage,requireRole} from '@/lib/auth';
import {getCustomerTickets} from '@/lib/store';
import GroupPassViewer from '@/components/GroupPassViewer';

export const dynamic='force-dynamic';

export default async function EventPasses({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId))notFound();
  const auth=await requirePage(()=>requireRole('customer'),'/login',`/account/tickets/event/${eventId}`);
  const tickets=(await getCustomerTickets(auth)).filter(ticket=>ticket.event_id===eventId);
  if(!tickets.length)notFound();
  const result=await auth.client.from('events').select('name,date,start_time,end_time,venues(name)').eq('id',eventId).maybeSingle();
  const row=result.data;
  const venue=Array.isArray(row?.venues)?row.venues[0]:row?.venues;
  return <GroupPassViewer tickets={tickets} event={row?{name:row.name,date:row.date,start_time:row.start_time,end_time:row.end_time,venue:venue?.name||'Venue'}:undefined}/>;
}
