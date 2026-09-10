import { Bars,PageHeader,Panel,Stat,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import EventCreateForm from '@/components/owner/EventCreateForm';
import PublishToggle from '@/components/owner/PublishToggle';
import { getOwnerEvent, promoterRows } from '@/lib/owner-data';
import { formatDate,formatINR,formatTime } from '@/lib/utils';

export default async function OwnerEventDetail({
  params,
  searchParams,
}:{
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ venue?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const data = await getOwnerEvent(eventId, query.venue);
  const { event } = data;

  const paidOrders = data.orders.filter(o => o.payment_status === 'PAID');
  const gross = paidOrders.reduce((s, o) => s + o.subtotal, 0);
  const refunds = data.orders.filter(o => o.payment_status === 'REFUNDED').reduce((s, o) => s + o.subtotal, 0);
  const used = data.tickets.filter(t => t.status === 'USED').length;
  const paidTickets = data.tickets.filter(t => paidOrders.some(order => order.id === t.order_id));
  const remaining = Math.max(0, event.ticket_capacity - paidTickets.length);
  const commission = Math.round((gross - refunds) * data.venue.commission_percentage / 100);
  const promoters = (await promoterRows(data)).filter(p => data.tickets.some(t => t.source_code === p.source_code));
  const salesByHour = Array.from({ length: 24 }, (_, hour) =>
    paidOrders.filter(o => new Date(o.created_at).getHours() === hour).reduce((sum, order) => sum + order.subtotal, 0)
  );

  const ticketTypeBreakdown = [...new Set(paidTickets.map(t => t.ticket_type))].map(type => ({
    type,
    count: paidTickets.filter(t => t.ticket_type === type).length,
    used: paidTickets.filter(t => t.ticket_type === type && t.status === 'USED').length,
    revenue: paidTickets
      .filter(t => t.ticket_type === type)
      .reduce((sum, t) => {
        const order = data.orders.find(o => o.id === t.order_id);
        return sum + (order ? order.subtotal / order.quantity : 0);
      }, 0),
  }));

  const entryRate = paidTickets.length ? Math.round((used / paidTickets.length) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={`${data.venue.name} · ${formatDate(event.date)} · ${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
        title={event.name}
        action={
          <div className="flex gap-2">
            <EventCreateForm mode="edit" venueId={data.venue.id} event={event} />
            <PublishToggle id={event.id} venueId={data.venue.id} published={event.published} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-x-5 lg:grid-cols-4">
        <Stat label="Tickets sold" value={data.tickets.length} />
        <Stat label="Remaining" value={remaining} />
        <Stat label="Revenue" value={formatINR(gross)} accent />
        <Stat label="Attendance" value={`${entryRate}%`} />
        <Stat label="Average ticket" value={formatINR(data.tickets.length ? gross / data.tickets.length : event.ticket_price)} />
        <Stat label="Refunds" value={formatINR(refunds)} />
        <Stat label="ARS commission" value={formatINR(commission)} />
        <Stat label="Venue payable" value={formatINR(Math.max(0, gross - refunds - commission))} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Sales by hour">
          <Bars values={salesByHour} />
        </Panel>

        <Panel title="Entry performance">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Checked-in</p>
              <p className="mt-1 text-xl font-black text-white">{used}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Entry rate</p>
              <p className="mt-1 text-xl font-black text-emerald-400">{entryRate}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Purchased</p>
              <p className="mt-1 text-xl font-black text-white">{paidTickets.length}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Ticket breakdown">
          <div className="space-y-4">
            {ticketTypeBreakdown.map((row) => (
              <div key={row.type} className="rounded border border-white/10 p-4">
                <p className="mb-2 text-sm font-black uppercase text-white">{row.type}</p>
                <p className="text-zinc-500 text-xs">Tickets issued: {row.count}</p>
                <p className="text-zinc-500 text-xs">Used: {row.used}</p>
                <p className="text-zinc-500 text-xs">Revenue: {formatINR(row.revenue)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Promoter performance">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Promoter</th>
                  <th className={thClass}>Tickets</th>
                  <th className={thClass}>Revenue</th>
                  <th className={thClass}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {promoters.map((p) => (
                  <tr key={p.source_code}>
                    <td className={tdClass}><strong className="text-white">{p.promoter_name}</strong></td>
                    <td className={tdClass}>{p.tickets_sold}</td>
                    <td className={tdClass}>{formatINR(p.gross_entry_revenue)}</td>
                    <td className={tdClass}>{formatINR(p.commission_payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
