import { getOwnerVenueData } from '@/lib/owner-data';
import { operatingNight, stamp } from '@/lib/owner-operations';
import { Panel, Stat } from '@/components/owner/OwnerUI';
import OperatingReport from './OperatingReport';
import OperationsRefresh from './OperationsRefresh';
import Link from 'next/link';

export default async function LiveOperations({venueId}:{venueId:string}) {
  const data = await getOwnerVenueData(venueId);
  const night = operatingNight(data);
  const paid = night.orders.filter(order => order.payment_status === 'PAID');
  const used = night.tickets.filter(ticket => ticket.status === 'USED');
  const recent = night.scans.filter(scan => Date.parse(scan.scanned_at) > Date.now()-300000);
  const scanners = new Set(recent.map(scan => scan.staff_id).filter(Boolean)).size;
  const gates = new Map<string, typeof night.scans>();
  for (const scan of night.scans) { const gate = (scan as typeof scan & {gate_name?:string}).gate_name || 'Gate not recorded'; gates.set(gate,[...(gates.get(gate)||[]),scan]); }
  const alerts = [
    ...night.events.filter(event => event.tickets_sold >= event.ticket_capacity && event.ticket_capacity > 0).map(event => `${event.name}: sold out.`),
    ...(recent.some(scan => scan.result !== 'VALID') ? ['Rejected or repeat scans in the last five minutes. Review gate activity.'] : []),
    ...(night.events.length && !scanners ? ['No scanner activity recorded in the last five minutes.'] : []),
  ];
  return <section className="mb-8 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Live operations</p><h2 className="mt-2 text-2xl font-semibold">Tonight at {data.venue.name}</h2></div><Link className="ars-button ars-button-secondary" href={`/owner/guests?venue=${venueId}`}>Open guest list</Link></div><OperationsRefresh/>
    <p className="text-xs text-zinc-500">Operating night: noon to noon IST. Updated {stamp(new Date().toISOString())}. Test orders remain labelled in guest and financial reports.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Tickets sold / tonight" value={paid.reduce((sum,order)=>sum+Number(order.quantity),0)}/><Stat label="Checked-in passes" value={used.length}/><Stat label="Recently active scanners" value={scanners} note="Distinct staff with a scan in the last 5 minutes; not a camera-online count."/><Stat label="Current occupancy" value="Not tracked" note="Check-ins do not establish who is still inside. Exit tracking is not enabled."/></div>
    <Panel title="Operational alerts">{alerts.length ? alerts.map(alert=><p key={alert} className="mb-2 border-l-2 border-amber-300 pl-3 text-sm text-amber-200">{alert}</p>) : <p className="text-sm text-zinc-400">{night.events.length ? 'No recorded alerts for this operating night.' : 'No published events scheduled for this operating night.'}</p>}</Panel>
    <OperatingReport title="Gate performance" columns={['Gate','Accepted scans','Repeat scans','Invalid scans','Last activity']} rows={[...gates].map(([gate,scans])=>[gate,String(scans.filter(scan=>scan.result==='VALID').length),String(scans.filter(scan=>scan.result==='ALREADY_USED').length),String(scans.filter(scan=>scan.result==='INVALID').length),stamp(scans.map(scan=>scan.scanned_at).sort().at(-1))])}/>
  </section>;
}
