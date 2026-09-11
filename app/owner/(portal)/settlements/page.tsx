import SettlementStatements from '@/components/owner/SettlementStatements';
import Link from 'next/link';
import { Empty,PageHeader,Panel,tableClass,tdClass,thClass,Stat } from '@/components/owner/OwnerUI';
import { getOwnerVenueData, ownerMetrics } from '@/lib/owner-data';
const formatINR = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);

export default async function OwnerSettlements({
  searchParams,
}:{
  searchParams: Promise<{ venue?: string }>;
}) {
  const query = await searchParams;
  const data = await getOwnerVenueData(query.venue);
  const metrics = ownerMetrics(data);
  const paidOrders = data.orders.filter(order => order.payment_status === 'PAID');
  const transactions = [...data.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const collected = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const discounts = paidOrders.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0);
  const processingFees = paidOrders.reduce((sum, order) => sum + Number(order.fees), 0);

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
      <Stat label="Paid ticket revenue (net)" value={formatINR(metrics.gross)} />
      <Stat label="Refunds" value={formatINR(metrics.refunds)} />
      <Stat label="Eligible revenue" value={formatINR(metrics.eligible)} />
      <Stat label="ARS commission" value={formatINR(metrics.commission)} />
      <Stat label="Venue payable" value={formatINR(metrics.venuePayable)} accent />
    </div>

    <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Stat label="Paid orders / tickets" value={`${paidOrders.length} / ${paidOrders.reduce((sum, order) => sum + order.quantity, 0)}`} />
      <Stat label="Customer payments" value={formatINR(collected)} />
      <Stat label="Discounts given" value={formatINR(discounts)} />
      <Stat label="Processing fees" value={formatINR(processingFees)} />
    </div>

    <div className="my-6">
      <Panel title="Individual transactions">
        <p className="mb-5 text-sm leading-6 text-zinc-400">One row per order, with the full ticket quantity and payment breakdown. Expand an order to see commission estimates and payment references. Summary cards above include paid orders only.</p>
        {transactions.length ? <div className="space-y-3">{transactions.map(order => {
          const net = Number(order.subtotal);
          const discount = Number(order.discount_amount || 0);
          const original = Number(order.original_subtotal ?? net + discount);
          const source = data.sources.find(item => item.code === order.source_code);
          const rate = order.promoter_commission_percentage ?? source?.commission_percentage;
          const arsRate = Number(data.venue.commission_percentage);
          const arsEstimate = Math.round(net * arsRate) / 100;
          const promoterEstimate = order.source_code && rate != null ? Math.round(net * Number(rate)) / 100 : null;
          const isPaid = order.payment_status === 'PAID';
          const isTest = order.razorpay_payment_id?.startsWith('test_payment_');
          const event = data.events.find(item => item.id === order.event_id);
          return <details key={order.id} className="group border border-white/10 bg-white/[0.02] open:border-[#cbb88a]/40">
            <summary className="cursor-pointer p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbb88a]">
              <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div><p className="font-semibold text-white">{order.customer_name}</p><p className="mt-1 text-xs text-zinc-400">{event?.name || 'Event'}</p><p className="mt-1 text-xs text-zinc-500">{new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p></div>
                <div><p className="text-xs text-zinc-400">Tickets / status</p><p className="mt-1 font-semibold text-white">{order.quantity} {order.quantity === 1 ? 'ticket' : 'tickets'}</p><p className="mt-1 text-xs text-[#cbb88a]">{order.payment_status}{isTest ? ' / TEST PAYMENT' : ''}</p></div>
                <div><p className="text-xs text-zinc-400">Discount applied</p><p className="mt-1 font-semibold text-emerald-300">{formatINR(discount)}</p><p className="mt-1 text-xs text-zinc-500">{order.coupon_code || 'No coupon'}</p></div>
                <div><p className="text-xs text-zinc-400">{isTest ? 'Simulated payment' : isPaid ? 'Customer paid' : 'Order total'}</p><p className="mt-1 font-semibold tabular-nums text-white">{formatINR(Number(order.total))}</p><p className="mt-1 text-xs text-[#cbb88a]">View breakdown</p></div>
              </div>
            </summary>
            <div className="grid gap-6 border-t border-white/10 p-4 sm:p-5 lg:grid-cols-2">
              <dl className="space-y-3 text-sm text-zinc-300">
                <div className="flex justify-between gap-4"><dt>Tickets before discount</dt><dd>{formatINR(original)}</dd></div>
                <div className="flex justify-between gap-4 text-emerald-300"><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd>-{formatINR(discount)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Discounted ticket revenue</dt><dd>{formatINR(net)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Processing fees</dt><dd>{formatINR(Number(order.fees))}</dd></div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-semibold text-white"><dt>{isPaid ? 'Paid total' : 'Order total'}</dt><dd>{formatINR(Number(order.total))}</dd></div>
              </dl>
              <div className="space-y-3 text-sm text-zinc-300">
                {isPaid ? <>
                  <div className="flex justify-between gap-4"><span>ARS commission estimate ({arsRate}%)</span><span>{formatINR(arsEstimate)}</span></div>
                  <div className="flex justify-between gap-4"><span>Venue share estimate</span><span className="text-[#cbb88a]">{formatINR(net - arsEstimate)}</span></div>
                  <div className="flex justify-between gap-4"><span>Promoter commission estimate{rate != null && order.source_code ? ` (${rate}%)` : ''}</span><span>{order.source_code ? promoterEstimate == null ? 'Rate unavailable' : formatINR(promoterEstimate) : formatINR(0)}</span></div>
                  <p className="text-xs leading-5 text-zinc-500">Commission uses discounted ticket revenue, excluding fees. ARS estimates use the current venue rate; aggregate rounding may differ. Promoter commission is shown separately, not deducted again from the venue share. These are earnings estimates, not proof of a transfer.</p>
                </> : <p className="text-xs text-zinc-400">This order is not currently paid and is not included in paid-order earnings above.</p>}
                <p className="break-all text-xs text-zinc-500">Referral: {order.source_code || 'Direct booking'}</p>
                <p className="break-all text-xs text-zinc-500">Order ID: {order.id}</p>
                <p className="break-all text-xs text-zinc-500">Payment reference: {order.razorpay_payment_id || 'Not available'}</p>
                {isTest && <p className="text-xs text-amber-300">Test transaction: no money was collected. Included in this database&apos;s reports and ticket counts.</p>}
              </div>
            </div>
          </details>;
        })}</div> : <Empty title="No transactions yet" copy="Each customer order will appear here with its ticket and payment breakdown." />}
      </Panel>
    </div>

    <SettlementStatements venueId={data.venue.id}/>
    <Panel title="Settlement history / recorded and estimated">
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Status</th>
                <th className={thClass}>Record / estimate date</th>
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
                  <td className={tdClass}>{row.id.startsWith('estimate-') ? 'ESTIMATE / NOT SETTLED' : row.status}</td>
                  <td className={tdClass}>{row.settlementDate}</td>
                  <td className={tdClass}><Link className="hover:text-accent-cyan" href={`/owner/events/${row.event_id}?venue=${row.venue_id}`}>{row.event_name || 'Event detail'}</Link></td>
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
        <p className="text-xs text-zinc-500">Owners cannot edit commission percentage, settlement amount, status, or payment verification.</p>
        <p className="mt-3 text-xs text-zinc-500">Commission is applied at venue-defined percentage: <strong>{data.venue.commission_percentage}%</strong>.</p>
      </Panel>
      <Panel title="Relevant transactions">
        <p className="text-xs text-zinc-500">Expand any individual transaction above for its discount, fees, commission estimates and payment reference. Settlement history remains an event-level summary.</p>
      </Panel>
    </div>
  </>;
}
