import { getOwnerVenueData } from '@/lib/owner-data';
import { money, stamp } from '@/lib/owner-operations';
import { Stat, Panel } from '@/components/owner/OwnerUI';
import OperatingReport from './OperatingReport';
type Funnel = {views:number;checkouts:number;purchases:number;first_observation:string|null;sources:{source:string;views:number;checkouts:number;purchases:number}[]};
export default async function MarketingIntelligence({venueId}:{venueId:string}) {
  const data=await getOwnerVenueData(venueId);
  const result=await data.owner.client.rpc('owner_funnel_report',{target_venue:venueId});
  const report=result.error?null:result.data as Funnel;
  const paid=data.orders.filter(order=>order.payment_status==='PAID' && Date.parse(order.created_at)>=Date.now()-30*86400000);
  const sources=[...new Set(paid.map(order=>order.source_code||'Direct'))];
  return <div className="space-y-6">
    <Panel title="Acquisition / last 30 days"><p className="text-sm leading-6 text-zinc-400">Funnel counts are distinct signed-in customer/event pairs, not page hits or all visitor traffic. Purchases are verified paid orders after a tracked checkout; test payments are excluded from funnel purchases. Browser privacy preferences and blocked tracking create gaps.</p>{!report && <p className="mt-3 text-sm text-amber-200">Funnel tracking is unavailable. Apply 0010_owner_operating_system.sql in Supabase to enable it. Existing sales reports remain available.</p>}{report && <p className="mt-3 text-xs text-zinc-500">First recorded observation: {stamp(report.first_observation)}. Historical activity is not backfilled.</p>}</Panel>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Signed-in event viewers" value={report?report.views:'Not tracked'}/><Stat label="Checkout starters" value={report?report.checkouts:'Not tracked'}/><Stat label="Purchasing customer/events" value={report?report.purchases:'Not tracked'}/><Stat label="Checkout conversion" value={report?.checkouts?`${(report.purchases/report.checkouts*100).toFixed(1)}%`:'Not available'} note="Purchasing pairs / checkout-starting pairs, not ticket quantity."/></div>
    <OperatingReport title="Tracked referral funnel" columns={['Recorded source','Event viewers','Checkout starters','Purchasers']} rows={(report?.sources||[]).map(row=>[row.source,String(row.views),String(row.checkouts),String(row.purchases)])}/>
    <OperatingReport title="Paid order sources / 30 days" columns={['Source','Paid orders','Tickets','Discounted revenue','Test orders included']} rows={sources.map(source=>{const orders=paid.filter(order=>(order.source_code||'Direct')===source);return [source,String(orders.length),String(orders.reduce((sum,order)=>sum+Number(order.quantity),0)),money(orders.reduce((sum,order)=>sum+Number(order.subtotal),0)),String(orders.filter(order=>order.razorpay_payment_id?.startsWith('test_payment_')).length)];})}/>
    <Panel title="Cities and locations"><p className="text-sm text-zinc-400">Not tracked. Customer city is not currently collected. Venue location and phone numbers are not used as a substitute for guest location.</p></Panel>
  </div>;
}
