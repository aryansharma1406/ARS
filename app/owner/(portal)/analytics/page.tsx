import Link from 'next/link';
import { Empty,PageHeader,Panel,Stat,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import AnalyticsChart from '@/components/owner/AnalyticsChart';
import { bucketByDay, customersForVenue, filterOrdersByRange, getOwnerVenueData, ownerMetrics, promoterRows, resolveDateRange } from '@/lib/owner-data';
import { formatINR } from '@/lib/utils';

type AnalyticsRange = 'ALL' | 'TODAY' | 'YESTERDAY' | '7D' | '30D' | 'CUSTOM';

export default async function OwnerAnalytics({
  searchParams,
}:{
  searchParams: Promise<{ venue?: string; range?: string; from?: string; to?: string }>;
}) {
  const query = await searchParams;
  const venueId = query.venue;
  const data = await getOwnerVenueData(venueId);
  const range = ((query.range as AnalyticsRange) || '7D');
  const now = new Date();
  const resolvedRange = range === 'CUSTOM' && query.from && query.to ? { from: query.from, to: query.to } : range;

  const rows = filterOrdersByRange(data.orders, resolvedRange as any, now);
  const paid = rows.filter(order => order.payment_status === 'PAID');
  const paidTickets = data.tickets.filter(ticket => paid.some(order => order.id === ticket.order_id));
  const usedTickets = paidTickets.filter(ticket => ticket.status === 'USED');
  const metrics = ownerMetrics(data, resolvedRange as any, now);

  const chartEnd = new Date(now);
  if (range === 'YESTERDAY') chartEnd.setDate(chartEnd.getDate() - 1);
  const revenueDays = bucketByDay(paid, chartEnd, range === '30D' ? 30 : ['TODAY', 'YESTERDAY'].includes(range) ? 1 : 7, 'ALL');
  const salesByDay = revenueDays.values;

  const scanWindow = resolveDateRange(resolvedRange as any, now);
  const scannedInRange = data.tickets.filter(ticket => ticket.status === 'USED' && ticket.scanned_at && new Date(ticket.scanned_at) >= scanWindow.from && new Date(ticket.scanned_at) <= scanWindow.to);
  const scanHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' });
  const attendanceByHour = Array.from({ length: 24 }, (_, hour) => {
    const hourTickets = scannedInRange.filter(ticket => Number(scanHour.format(new Date(ticket.scanned_at!))) === hour);
    return hourTickets.length;
  });

  const ticketTypeBreakdown = new Map<string, { count: number; revenue: number }>();
  for (const ticket of paidTickets) {
    const record = ticketTypeBreakdown.get(ticket.ticket_type) || { count: 0, revenue: 0 };
    const order = paid.find(o => o.id === ticket.order_id);
    record.count += 1;
    record.revenue += order ? Number(order.subtotal) / Math.max(1, Number(order.quantity)) : 0;
    ticketTypeBreakdown.set(ticket.ticket_type, record);
  }

  const customerRows = customersForVenue(data, resolvedRange as any, now);
  const returningCustomers = customerRows.filter(c => c.visits > 1).length;

  const promoterMetrics = await promoterRows(data);
  const topEventByRevenue = data.events
    .map(event => ({
      name: event.name,
      value: paid.filter(order => order.event_id === event.id).reduce((sum, order) => sum + order.subtotal, 0),
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const customTo = query.to ? new Date(query.to).toLocaleDateString('en-IN') : '';
  const customFrom = query.from ? new Date(query.from).toLocaleDateString('en-IN') : '';

  return <>
    <PageHeader
      eyebrow="Venue intelligence"
      title="Analytics"
      action={
        <div className="flex flex-wrap gap-2 border border-white/10 p-1 rounded-xl bg-black/20">
          {['TODAY', 'YESTERDAY', '7D', '30D'].map(item => <Link
            key={item}
            href={`/owner/analytics?venue=${data.venue.id}&range=${item}`}
            className={`px-3 py-2 text-xs font-black uppercase tracking-[.16em] ${range === item ? 'ars-chip' : 'text-zinc-400'}`}
          >
            {item}
          </Link>)}
        </div>
      }
    />

    <div className="grid grid-cols-2 gap-x-5 lg:grid-cols-5">
      <Stat label="Revenue" value={formatINR(metrics.gross)} accent />
      <Stat label="Tickets sold" value={metrics.sold} />
      <Stat label="Average ticket" value={formatINR(metrics.sold ? metrics.gross / metrics.sold : 0)} />
      <Stat label="Attendance rate" value={`${metrics.sold ? Math.round((usedTickets.length / paidTickets.length || 0) * 100) : 0}%`} />
      <Stat label="Repeat customers" value={returningCustomers} />
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Panel title={`Revenue trend · ${range === 'CUSTOM' ? `${customFrom} to ${customTo}` : range}`}><AnalyticsChart kind="revenue" labels={revenueDays.labels} values={salesByDay} /></Panel>
      <Panel title="Peak entry times"><AnalyticsChart kind="entries" labels={Array.from({length:24},(_,i) => `${i % 12 || 12}${i < 12 ? 'am' : 'pm'}`)} values={attendanceByHour} /></Panel>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Panel title="Event performance">
        {!topEventByRevenue.length ? <Empty title="No event performance yet" copy="Create and sell an event to display performance." /> :
          <table className={tableClass}>
            <thead><tr><th className={thClass}>Event</th><th className={thClass}>Revenue</th></tr></thead>
            <tbody>
              {topEventByRevenue.map(event => <tr key={event.name}><td className={tdClass}>{event.name}</td><td className={tdClass}>{formatINR(event.value)}</td></tr>)}
            </tbody>
          </table>
        }
      </Panel>

      <Panel title="Ticket type performance">
        {!ticketTypeBreakdown.size ? <Empty title="No sales yet" copy="Sales data is required for ticket type analysis." /> :
          <table className={tableClass}>
            <thead><tr><th className={thClass}>Type</th><th className={thClass}>Count</th><th className={thClass}>Revenue</th></tr></thead>
            <tbody>
              {Array.from(ticketTypeBreakdown).map(([type, report]) =>
                <tr key={type}><td className={tdClass}>{type}</td><td className={tdClass}>{report.count}</td><td className={tdClass}>{formatINR(report.revenue)}</td></tr>
              )}
            </tbody>
          </table>
        }
      </Panel>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Panel title="Customer performance">
        <p className="text-xs text-zinc-500">Customers with visits</p>
        <p className="mt-1 text-2xl font-black text-white">{customerRows.length}</p>
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-500">Average spend</p>
        <p className="mt-2 text-lg font-black text-white">{formatINR(customerRows.length ? customerRows.reduce((sum, c) => sum + c.averageSpend, 0) / customerRows.length : 0)}</p>
      </Panel>

      <Panel title="Promoter performance">
        {promoterMetrics.length ? <div className="space-y-3">{promoterMetrics.slice(0, 4).map(promoter => <div key={promoter.source_code} className="flex justify-between gap-4 border-b border-white/10 pb-2"><span className="text-zinc-300">{promoter.promoter_name}</span><span className="font-black">{promoter.tickets_sold} · {formatINR(promoter.gross_entry_revenue)}</span></div>)}</div> : <Empty title="No promoters yet" copy="No attributed promoter sales in this range." />}
      </Panel>

      <Panel title="Customer repeat behavior">
        <p className="text-xs text-zinc-500">Returning customers</p>
        <p className="mt-2 text-2xl font-black text-white">{returningCustomers}</p>
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-500">Repeat rate</p>
        <p className="mt-2 font-black text-white">{customerRows.length ? `${Math.round((returningCustomers / customerRows.length) * 100)}%` : '0%'}</p>
      </Panel>
    </div>

    {query.from || query.to ?
      <p className="mt-6 text-xs text-zinc-500">Custom filter is in use. Showing events and customers from {query.from || 'start'} to {query.to || 'end'}.</p>
      : null}
  </>;
}
