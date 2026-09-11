'use client';
import { useState } from 'react';
import { LiveSearchInput, SearchHighlight } from '@/components/LiveSearch';
import { matchesSearch } from '@/lib/search';
import type { Ticket, Order } from '@/lib/types';
import { Empty,PageHeader,Panel,Stat,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import { formatINR } from '@/lib/utils';
type Query = {venue?:string;query?:string;status?:string;event?:string;payment?:string;entry?:string;from?:string;to?:string;range?:string};
export default function OwnerTicketResults({ q, data, initialRows, orders, venueName }: { q: Query; data: { venue: {id: string}; events: {id:string;name:string}[] }; initialRows: Ticket[]; orders: Order[]; venueName: string }) {
  const [search, setSearch] = useState(q.query || '');
  const orderScopeMap = new Map(orders.map(order => [order.id, order]));
  const rows = initialRows.filter(ticket => matchesSearch(search, [ticket.id, ticket.order_id, ticket.customer_name, ticket.customer_phone, ticket.customer_email, ticket.event_name, venueName, ticket.ticket_type, ticket.source_code]));
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
        <LiveSearchInput name="query" value={search} onChange={setSearch} placeholder="Search guest, event, venue or booking" />
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
                    <td className={`${tdClass} font-mono text-xs text-white`}><SearchHighlight query={search}>{ticket.id}</SearchHighlight><p className="mt-2 text-[10px] text-zinc-500">Booking: <SearchHighlight query={search}>{ticket.order_id}</SearchHighlight></p></td>
                    <td className={tdClass}><strong className="text-white"><SearchHighlight query={search}>{ticket.customer_name}</SearchHighlight></strong><br/><span className="text-xs"><SearchHighlight query={search}>{ticket.customer_email}</SearchHighlight></span><br /><span className="text-xs"><SearchHighlight query={search}>{ticket.customer_phone}</SearchHighlight></span></td>
                    <td className={tdClass}><SearchHighlight query={search}>{ticket.event_name || '—'}</SearchHighlight><p className="mt-1 text-xs"><SearchHighlight query={search}>{venueName}</SearchHighlight></p></td>
                    <td className={tdClass}><SearchHighlight query={search}>{ticket.ticket_type}</SearchHighlight></td>
                    <td className={tdClass}>{order ? formatINR(order.subtotal / order.quantity) : '—'}</td>
                    <td className={tdClass}>{order?.payment_status || '—'}</td>
                    <td className={tdClass}>{ticket.status}</td>
                    <td className={tdClass}>{new Date(order?.created_at || ticket.created_at).toLocaleString('en-IN')}</td>
                    <td className={tdClass}><SearchHighlight query={search}>{ticket.source_code || 'Direct'}</SearchHighlight></td>
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
