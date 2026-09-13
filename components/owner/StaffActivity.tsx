import { getOwnerVenueData } from '@/lib/owner-data';
import { stamp } from '@/lib/owner-operations';
import OperatingReport from './OperatingReport';
export default async function StaffActivity({venueId}:{venueId:string}) {
  const data=await getOwnerVenueData(venueId);
  const {data:audits,error}=await data.owner.client.from('audit_logs').select('id,actor_user_id,action,entity_type,entity_id,created_at').eq('venue_id',venueId).order('created_at',{ascending:false}).limit(200);
  const {data:assignments,error:assignmentError}=await data.owner.client.from('venue_staff_assignments').select('id,user_id,event_id,gate_name,active,created_at').eq('venue_id',venueId);
  const invitations=await data.owner.client.from('staff_invitations').select('assignment_id,name').eq('venue_id',venueId).order('created_at',{ascending:false});
  const namesByAssignment=new Map<string,string>();
  for(const invitation of invitations.data||[]) {
    if(invitation.assignment_id&&invitation.name&&!namesByAssignment.has(invitation.assignment_id)) namesByAssignment.set(invitation.assignment_id,invitation.name);
  }
  const namesByUser=new Map<string,string>();
  for(const assignment of assignments||[]) {
    const name=namesByAssignment.get(assignment.id);
    if(name)namesByUser.set(assignment.user_id,name);
  }
  return <div className="mt-6 space-y-6"><p className="text-xs text-zinc-500">Staff retain the existing scanner role, restricted to assigned venues, events and gates. This view does not grant admin or financial access.</p>{assignmentError?<p className="text-sm text-amber-200">Assignment activity is temporarily unavailable.</p>:<OperatingReport title="Scanner access" columns={['Staff name','Staff account ID','Role','Event access','Gate','Status','Last scan']} rows={(assignments||[]).map(assignment=>[namesByAssignment.get(assignment.id)||namesByUser.get(assignment.user_id)||'Name not recorded',assignment.user_id,'Scanner',assignment.event_id?data.events.find(event=>event.id===assignment.event_id)?.name||assignment.event_id:'All venue events',assignment.gate_name||'All assigned gates',assignment.active?'Active':'Disabled',stamp(data.scans.filter(scan=>scan.staff_id===assignment.user_id).map(scan=>scan.scanned_at).sort().at(-1))])}/>}
    <OperatingReport title="Scan activity / latest 200" columns={['Time','Staff name','Staff ID','Event','Gate','Result','Pass ID']} rows={[...data.scans].sort((a,b)=>b.scanned_at.localeCompare(a.scanned_at)).slice(0,200).map(scan=>[stamp(scan.scanned_at),namesByUser.get(scan.staff_id)||'Name not recorded',scan.staff_id,data.events.find(event=>event.id===scan.event_id)?.name||scan.event_id,(scan as typeof scan & {gate_name?:string}).gate_name||'Not recorded',scan.result,scan.ticket_id])}/>
    {error?<p className="text-sm text-amber-200">The audit log is unavailable under the current database permissions.</p>:<OperatingReport title="Access audit / latest 200" columns={['Recorded at','Actor ID','Action','Entity','Entity ID']} rows={(audits||[]).map(row=>[stamp(row.created_at),row.actor_user_id,row.action,row.entity_type,row.entity_id||'Not recorded'])}/>}
  </div>;
}
