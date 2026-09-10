import { Empty,PageHeader,Panel,Stat,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import { DateFilter, filterOrdersByRange, getOwnerVenueData } from '@/lib/owner-data';
import { formatINR } from '@/lib/utils';

export default async function OwnerTickets({
  searchParams,
}:{
  searchParams:Promise<{venue?:string;query?:string;status?:string;event?:string;payment?:string;entry?:string;from?:string;to?:string;range?:string}>;
}) {
  const q = await searchParams;
  const data = await getOwnerVenueData(q.venue);
  const query = (q.query || '').toLowerCase();
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
    const hasSearch = !query || [ticket.id, ticket.customer_name, ticket.customer_phone, ticket.customer_email].some(value => value?.toLowerCase().includes(query));

    return hasPaymentFilter && hasEntryFilter && hasEventFilter && hasSearch;
  });

  const csv = ['Ticket ID,Customer,Event,Type,Amount,Payment,Entry,Purchased,Source', ...rows.map(ticket => {
    const order = orderScopeMap.get(ticket.order_id);
    const amount = order ? order.subtotal / order.quantity : 0;
    const purchase = order?.created_at || ticket.created_at;
    const values = [
      ticket.id,
      ticket.customer_name,
      ticket.event_name || '—',
      ticket.ticket_type,
      `₹${amount}`,
      order?.payment_status || '—',
      ticket.status,
      new Date(purchase).toLocaleString('en-IN'),
      ticket.source_code || 'Direct',
    ];
    return values.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
  })].join('\n');

  return <>
    <PageHeader eyebrow="Venue ledger" title="Tickets" description="Read-only ticket, payment, and entry data for this venue." />

    <Panel title="Search & filters">
      <form className="grid gap-3 md:grid-cols-5">
        <input type="hidden" name="venue" value={data.venue.id} />
        <input name="query" defaultValue={q.query} placeholder="Ticket, customer or phone" className="ars-input" />
        <select name="event" defaultValue={q.event || ''} className="ars-select">
          <option value="">All events</option>
          {data.events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
        <select name="payment" defaultValue={q.payment || ''} className="ars-select">
          <option value="">All payment</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select name="entry" defaultValue={q.entry || ''} className="ars-select">
          <option value="">All entry</option>
          <option value="VALID">Valid</option>
          <option value="USED">Used</option>
          <option value="PAYMENT_FAILED">Payment failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select name="range" defaultValue={q.range || 'ALL'} className="ars-select">
          <option value="ALL">All time</option>
          <option value="TODAY">Today</option>
          <option value="YESTERDAY">Yesterday</option>
          <option value="7D">Last 7 days</option>
          <option value="30D">Last 30 days</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <input name="from" type="date" defaultValue={q.from} className="ars-input" />
        <input name="to" type="date" defaultValue={q.to} className="ars-input" />
        <button className="ars-button md:col-span-1">Apply filters</button>
        <a className="ars-button ars-button-secondary" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Export CSV</a>
      </form>
    </Panel>

    <div className="mt-6">
      <Panel title={`${rows.length} tickets`}>
        {rows.length ?
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {['Ticket ID','Customer','Event','Type','Amount','Payment','Entry','Purchased','Source'].map(header => <th key={header} className={thClass}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(ticket => {
                  const order = orderScopeMap.get(ticket.order_id);
                  return <tr key={ticket.id}>
                    <td className={`${tdClass} font-mono text-xs text-white`}>{ticket.id}</td>
                    <td className={tdClass}><strong className="text-white">{ticket.customer_name}</strong><br /><span className="text-xs">{ticket.customer_phone}</span></td>
                    <td className={tdClass}>{ticket.event_name || '—'}</td>
                    <td className={tdClass}>{ticket.ticket_type}</td>
                    <td className={tdClass}>{order ? formatINR(order.subtotal / order.quantity) : '—'}</td>
                    <td className={tdClass}>{order?.payment_status || '—'}</td>
                    <td className={tdClass}>{ticket.status}</td>
                    <td className={tdClass}>{new Date(order?.created_at || ticket.created_at).toLocaleString('en-IN')}</td>
                    <td className={tdClass}>{ticket.source_code || 'Direct'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        : <Empty title="No tickets found" copy="Ticket sales matching these filters will appear here." />}
      </Panel>
    </div>

    <div className="mt-6 grid gap-6 md:grid-cols-3">
      <Stat label="Selected entries" value={rows.length} />
      <Stat label="Used" value={rows.filter(ticket => ticket.status === 'USED').length} />
      <Stat label="Open" value={rows.filter(ticket => ticket.status === 'VALID').length} />
    </div>
  </>;
}
