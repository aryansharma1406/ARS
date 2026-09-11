import { getOwnerVenueData } from '@/lib/owner-data';
import { money, stamp } from '@/lib/owner-operations';
import { Stat } from '@/components/owner/OwnerUI';
import OperatingReport from './OperatingReport';
export default async function SettlementStatements({venueId}:{venueId:string}) {
  const data=await getOwnerVenueData(venueId);
  const result=await data.owner.client.from('settlements').select('*').eq('venue_id',venueId).order('created_at',{ascending:false});
  if(result.error) return <p className="my-6 text-sm text-amber-200">Recorded settlement statements are temporarily unavailable.</p>;
  const saved=result.data||[];
  const settled=saved.filter(row=>row.status==='SETTLED');
  const pending=saved.filter(row=>row.status==='PENDING');
  return <section className="my-6 space-y-5"><div className="grid grid-cols-2 gap-3"><Stat label="Recorded settled amount" value={money(settled.reduce((sum,row)=>sum+Number(row.venue_amount),0))} note="Recorded settlement status, not independent bank-transfer confirmation."/><Stat label="Recorded pending amount" value={money(pending.reduce((sum,row)=>sum+Number(row.venue_amount),0))} note="Persisted pending records only. Estimates are excluded."/></div><p className="text-xs leading-6 text-zinc-500">Statements use stored settlement records without changing calculations. Record creation dates are not payment dates. Historical payment timestamps are shown only when present.</p><OperatingReport title="Recorded settlement statements" filename="ARS-settlement-statement.csv" columns={['Settlement ID','Event','Status','Created at','Paid at (if recorded)','Eligible revenue','ARS commission','Venue amount']} rows={saved.map(row=>[row.id,data.events.find(event=>event.id===row.event_id)?.name||row.event_id,row.status,stamp(row.created_at),stamp(row.paid_at||row.settled_at),money(Number(row.eligible_revenue)),money(Number(row.commission_amount)),money(Number(row.venue_amount))])}/></section>;
}
