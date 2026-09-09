import Link from 'next/link';
import { Empty,PageHeader,Panel,tableClass,tdClass,thClass,Stat } from '@/components/owner/OwnerUI';
import { getOwnerVenueData, ownerMetrics } from '@/lib/owner-data';
import { formatINR } from '@/lib/utils';

export default async function OwnerSettlements({
  searchParams,
}:{
  searchParams: Promise<{ venue?: string }>;
}) {
  const query = await searchParams;
  const data = await getOwnerVenueData(query.venue);
  const metrics = ownerMetrics(data);

  const rows = data.settlements.map(settlement => {
    const relatedOrders = data.orders.filter(order => order.event_id === settlement.event_id && order.payment_status === 'PAID');
    const gross = relatedOrders.reduce((sum, order) => sum + order.subtotal, 0);
    const refunds = relatedOrders.filter(order => order.payment_status === 'REFUNDED').reduce((sum, order) => sum + order.subtotal, 0);
    const txCount = relatedOrders.length;
    const txTickets = relatedOrders.reduce((sum, order) => sum + order.quantity, 0);

    return {
      ...settlement,
      settlementDate: settlement.created_at ? new Date(settlement.created_at).toLocaleDateString('en-IN') : '—',
      period: settlement.created_at ? `${new Date(settlement.created_at).toLocaleString('en-IN')}` : '—',
      txCount,
      txTickets,
      gross,
      refunds,
    };
  });

  return <>
    <PageHeader eyebrow="Financial ledger" title="Settlements" description="Venue payable calculations and settlement status from real transaction history." />

    <div className="grid grid-cols-2 gap-x-5 lg:grid-cols-5">
      <Stat label="Gross revenue" value={formatINR(metrics.gross)} />
      <Stat label="Refunds" value={formatINR(metrics.refunds)} />
      <Stat label="Eligible revenue" value={formatINR(metrics.eligible)} />
      <Stat label="ARS commission" value={formatINR(metrics.commission)} />
      <Stat label="Venue payable" value={formatINR(metrics.venuePayable)} accent />
    </div>

    <Panel title="Settlement history">
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Status</th>
                <th className={thClass}>Settlement date</th>
                <th className={thClass}>Event</th>
                <th className={thClass}>Venue payable</th>
                <th className={thClass}>Gross</th>
                <th className={thClass}>Refunds</th>
                <th className={thClass}>Commission</th>
                <th className={thClass}>Period</th>
                <th className={thClass}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.status}</td>
                  <td className={tdClass}>{row.settlementDate}</td>
                  <td className={tdClass}><Link className="hover:text-[#d8c79e]" href={`/owner/events/${row.event_id}?venue=${row.venue_id}`}>{row.event_name || 'Event detail'}</Link></td>
                  <td className={tdClass}>{formatINR(row.venue_amount)}</td>
                  <td className={tdClass}>{formatINR(row.gross_revenue)}</td>
                  <td className={tdClass}>{formatINR(row.refunds)}</td>
                  <td className={tdClass}>{formatINR(row.commission_amount)}</td>
                  <td className={tdClass}>{row.period}</td>
                  <td className={tdClass}>{row.txCount} orders · {row.txTickets} tickets</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="No settlements yet" copy="Settlement rows will appear once venue sales are completed." />}
    </Panel>

    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <Panel title="Settlement policy">
        <p className="text-xs text-zinc-600">Owner cannot edit commission percentage, settlement amount, status, or payment verification.</p>
        <p className="mt-3 text-xs text-zinc-600">Commission is applied at venue-defined percentage: <strong>{data.venue.commission_percentage}%</strong>.</p>
      </Panel>
      <Panel title="Relevant transactions">
        {rows.length ? <p className="text-xs text-zinc-600">Use the Events page for ticket-level and scan-level audit of each settlement period.</p> : <p className="text-xs text-zinc-600">No transaction references yet.</p>}
      </Panel>
    </div>
  </>;
}
