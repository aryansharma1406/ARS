import { Stat } from '@/components/owner/OwnerUI';
import { Empty,PageHeader,Panel,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import { customersForVenue, getOwnerVenueData } from '@/lib/owner-data';
import { formatINR } from '@/lib/utils';

export default async function OwnerCustomers({
  searchParams,
}:{
  searchParams: Promise<{ venue?: string }>;
}) {
  const q = await searchParams;
  const data = await getOwnerVenueData(q.venue);
  const customers = customersForVenue(data);

  return <>
    <PageHeader
      eyebrow="Venue CRM"
      title="Customers"
      description="Read-only guest profile with purchase and attendance history for the selected venue."
    />

    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3"><Stat label="Purchasing accounts" value={customers.length}/><Stat label="Repeat attendees" value={customers.filter(customer=>customer.eventsAttended>1).length}/><Stat label="Checked-in events / accounts" value={customers.reduce((sum,customer)=>sum+customer.eventsAttended,0)}/></div>
    <p className="mb-5 text-xs leading-6 text-zinc-500">Visits count distinct events with a successful check-in, not bookings. Customer profiles are grouped by booking email; group passes are not proof of separate named individuals. Total spend uses discounted ticket revenue, excluding fees, and includes any paid test orders in this database.</p>
    <Panel title="Customer 360">
      {customers.length ?
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                {[
                  'Customer',
                  'Contact',
                  'Visits',
                  'Tickets',
                  'Total spent',
                  'Average spend',
                  'Last visit',
                  'Events attended',
                ].map(h => <th key={h} className={thClass}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => <tr key={customer.email}>
                <td className={tdClass}><strong className="text-white">{customer.name}</strong></td>
                <td className={tdClass}>{customer.phone ? `${customer.phone}` : 'No phone'}</td>
                <td className={tdClass}>{customer.visits}</td>
                <td className={tdClass}>{customer.tickets}</td>
                <td className={tdClass}>{formatINR(customer.spent)}</td>
                <td className={tdClass}>{formatINR(customer.averageSpend)}</td>
                <td className={tdClass}>{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-IN') : '—'}</td>
                <td className={tdClass}>{customer.eventsAttended}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      : <Empty title="No customers yet" copy="Customer history appears after first completed purchase." />}
    </Panel>

    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {customers.map(customer => (
        <Panel key={customer.email} title={customer.name}>
          <p className="text-xs text-zinc-500">Purchase history: {customer.purchaseHistory.length}</p>
          <div className="mt-4 space-y-2">
            {customer.purchaseHistory.slice(0, 4).map((entry, i) => <p key={`${customer.email}-${entry.orderId}-${i}`} className="text-xs text-zinc-400">{entry.event} · {entry.ticketType} · {formatINR(entry.amount)} · {new Date(entry.date).toLocaleDateString('en-IN')}</p>)}
          </div>
          <p className="mt-4 text-xs text-zinc-500">Attendance records: {customer.attendanceHistory.length}</p>
          <div className="mt-2 space-y-2">
            {customer.attendanceHistory.slice(0, 4).map((entry, i) => <p key={`${customer.email}-att-${entry.orderId}-${i}`} className="text-xs text-zinc-400">{entry.event} · {entry.ticketType} · {new Date(entry.date).toLocaleDateString('en-IN')}</p>)}
          </div>
        </Panel>
      ))}
    </div>
  </>;
}
