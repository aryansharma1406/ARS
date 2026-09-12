'use server';
import {requireAdmin} from './auth';
import {getAdminPerformanceData,venuePerformance} from './admin-performance';
import {getSettlementReports} from './store';
import {eventPhase} from './event-schedule';

export async function getAdminVenueCards() {
  const auth=await requireAdmin();
  const data=await getAdminPerformanceData();
  const reports=await getSettlementReports();
  const staff=new Map<string,Set<string>>();let staffAvailable=true;
  for(let offset=0;;offset+=1000){
    const result=await auth.client.from('venue_staff_assignments').select('id,venue_id,user_id').eq('active',true).order('id').range(offset,offset+999);
    if(result.error){staffAvailable=false;break;}
    for(const row of result.data||[]){if(!staff.has(row.venue_id))staff.set(row.venue_id,new Set());staff.get(row.venue_id)!.add(row.user_id);}
    if((result.data||[]).length<1000)break;
  }
  const now=Date.now();
  return {venues:data.venues,metrics:data.venues.map(venue=>{
    const r=venuePerformance(data,venue.id,30,now);const settlements=reports.filter(s=>s.venue_id===venue.id);
    return {id:venue.id,revenue:r.revenue,tickets:r.sold,checkins:r.used.length,growth:r.growth,
      activeEvents:venue.active?r.events.filter(e=>e.published&&['upcoming','live'].includes(eventPhase(e,now))).length:0,
      staff:staffAvailable?(staff.get(venue.id)?.size||0):null,
      earnings:settlements.reduce((sum,s)=>sum+Number(s.commission_amount),0),
      payable:settlements.reduce((sum,s)=>sum+Number(s.venue_amount),0),
      estimated:settlements.some(s=>s.id.startsWith('estimate-'))};
  })};
}
