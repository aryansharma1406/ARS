import { Empty,PageHeader,Panel,Stat,tableClass,tdClass,thClass } from '@/components/owner/OwnerUI';
import { getOwnerVenueData, promoterRows } from '@/lib/owner-data';
import { formatINR } from '@/lib/utils';

export default async function OwnerPromoters({
  searchParams,
}:{
  searchParams: Promise<{ venue?: string }>;
}) {
  const q = await searchParams;
  const data = await getOwnerVenueData(q.venue);
  const rows = await promoterRows(data);
  const totalTickets = rows.reduce((sum, row) => sum + row.tickets_sold, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.gross_entry_revenue, 0);

  return <>
    <PageHeader
      eyebrow="Venue acquisition"
      title="Promoters"
      description="Track promoter attribution, commission liability, and event performance."
    />

    <div className="grid grid-cols-2 gap-x-5 lg:grid-cols-4">
      <Stat label="Active codes" value={rows.length} />
      <Stat label="Attributed sales" value={totalTickets} />
      <Stat label="Attributed revenue" value={formatINR(totalRevenue)} />
      <Stat label="Commission payable" value={formatINR(rows.reduce((sum,row)=>sum+row.commission_payable,0))} accent />
    </div>

    <Panel title="Promoter performance">
      {rows.length ?
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                {['Promoter','Code','Tickets sold','Revenue','Entries','Commission','Entries rate','Events'].map(header => <th key={header} className={thClass}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => <tr key={row.source_code}>
                <td className={tdClass}><strong className="text-white">{row.promoter_name}</strong></td>
                <td className={tdClass}>{row.source_code}</td>
                <td className={tdClass}>{row.tickets_sold}</td>
                <td className={tdClass}>{formatINR(row.gross_entry_revenue)}</td>
                <td className={tdClass}>{row.entries}</td>
                <td className={tdClass}>{formatINR(row.commission_payable)}</td>
                <td className={tdClass}>{row.conversion}%</td>
                <td className={tdClass}>{Math.min(rows.length, row.tickets_sold)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      : <Empty title="No promoters yet" copy="Promoters assigned to tracked sources will appear here." />}
    </Panel>

    <div className="mt-6">
      <Panel title="Attribution chain safety">
        <p className="text-sm text-zinc-600">Order source → Ticket → Scan → Settlement attribution remains system-managed.</p>
        <p className="mt-2 text-sm text-zinc-600">Owners can read this report but cannot alter historical commission or attribution mappings.</p>
      </Panel>
    </div>
  </>;
}
