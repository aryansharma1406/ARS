import OwnerTicketResults from '@/components/owner/OwnerTicketResults';
import { DateFilter, filterOrdersByRange, getOwnerVenueData } from '@/lib/owner-data';

export default async function OwnerTickets({
  searchParams,
}:{
  searchParams:Promise<{venue?:string;query?:string;status?:string;event?:string;payment?:string;entry?:string;from?:string;to?:string;range?:string}>;
}) {
  const q = await searchParams;
  const data = await getOwnerVenueData(q.venue);
  const range = (q.range || 'ALL') as Exclude<DateFilter, {from: string; to: string}> | 'CUSTOM';
  const scopedRange: DateFilter =
    range === 'CUSTOM' && q.from && q.to ? { from: q.from, to: q.to } : (range === 'TODAY' || range === 'YESTERDAY' || range === '7D' || range === '30D') ? range : 'ALL';
  const hasCustomRange = range === 'CUSTOM' && q.from && q.to;
  const orderScope = hasCustomRange
    ? filterOrdersByRange(data.orders, { from: q.from!, to: q.to! })
    : filterOrdersByRange(data.orders, scopedRange);
  const orderScopeMap = new Map(orderScope.map(order => [order.id, order]));

  const rows = data.tickets.filter(ticket => {
    const order = orderScopeMap.get(ticket.order_id);
    if (!order) return false;

    const hasPaymentFilter = q.payment ? order.payment_status === q.payment : true;
    const hasEntryFilter = q.entry ? ticket.status === q.entry : true;
    const hasEventFilter = q.event ? ticket.event_id === q.event : true;


    return hasPaymentFilter && hasEntryFilter && hasEventFilter;
  });

  return <OwnerTicketResults key={JSON.stringify(q)} q={q} data={{venue: {id: data.venue.id}, events: data.events.map(event => ({id: event.id, name: event.name}))}} initialRows={rows} orders={orderScope} venueName={data.venue.name} />;
}
