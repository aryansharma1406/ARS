import { getOwnerVenueData, promoterRows } from '@/lib/owner-data';
import { money } from '@/lib/owner-operations';
import OperatingReport from './OperatingReport';
import ReferralLink from './ReferralLink';
export default async function PromoterEventPerformance({venueId}:{venueId:string}) {
  const data=await getOwnerVenueData(venueId);
  const records:string[][]=[];
  for(const event of data.events) {
    const reports=await promoterRows({...data,orders:data.orders.filter(order=>order.event_id===event.id),tickets:data.tickets.filter(ticket=>ticket.event_id===event.id)});
    for(const row of reports.filter(row=>row.tickets_sold>0||row.entries>0)) records.push([event.name,row.promoter_name,row.source_code,String(row.tickets_sold),money(row.gross_entry_revenue),String(row.entries),money(row.commission_payable)]);
  }
  return <div className="mt-6 space-y-6"><OperatingReport title="Event-wise promoter performance" columns={['Event','Promoter','Code','Tickets','Discounted revenue','Check-ins','Commission earned']} rows={records}/><section className="ars-card space-y-4 p-5"><h2 className="text-sm font-bold uppercase tracking-widest">Promoter referral links</h2>{data.sources.map(source=><div key={source.code} className="border-b border-white/10 pb-4"><p className="mb-2 text-sm">{source.name}</p><ReferralLink code={source.code}/></div>)}</section></div>;
}
