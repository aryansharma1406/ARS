'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type { PerformanceData } from '@/lib/admin-performance';
const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(value);
import {eventPhase} from '@/lib/event-schedule';
import {promoterCommission} from '@/lib/promoter-commission';
import NetworkSalesChart from '@/components/admin/NetworkSalesChart';
import {ArrowUpRight,Activity} from 'lucide-react';

function Table({title,columns,rows}:{title:string;columns:string[];rows:{id:string;href?:string;cells:string[]}[]}) {
  return <section className="ars-card min-w-0 overflow-hidden"><h2 className="border-b border-white/10 p-5 text-sm font-bold uppercase tracking-widest">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead><tr>{columns.map(column=><th key={column} className="px-4 py-4 text-[10px] uppercase tracking-wider text-zinc-500">{column}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-white/5 hover:bg-[#cbb88a]/5">{row.cells.map((cell,index)=><td key={index} className={index===0?'font-semibold text-[#e2d4ae]':'text-zinc-300'}>{row.href?<Link href={row.href} className="block min-h-12 px-4 py-4">{cell}{index===0&&<ArrowUpRight size={12} className="ml-2 inline"/>}</Link>:<span className="block px-4 py-4">{cell}</span>}</td>)}</tr>)}</tbody></table></div>{!rows.length&&<p className="p-10 text-center text-sm text-zinc-500">No records for this period.</p>}</section>;
}
type Filters = {range?:string;from?:string;to?:string};
type SettlementSummary = {created_at:string;commission_amount:number;status:string};
export default function AdminOverview({data,settlements,initialFilters,asOf}:{data:PerformanceData;settlements:SettlementSummary[];initialFilters:Filters;asOf:number}) {
  const [q,setFilters]=useState(initialFilters);
  const router=useRouter();
  const [refreshing,startRefresh]=useTransition();
  useEffect(()=>{
    const restore=()=>{const params=new URLSearchParams(window.location.search);setFilters({range:params.get('range')||undefined,from:params.get('from')||undefined,to:params.get('to')||undefined});};
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[]);
  function selectFilters(next:Filters) {
    setFilters(next);
    const url=new URL(window.location.href);
    for(const key of ['range','from','to'] as const) {
      if(next[key]) url.searchParams.set(key,next[key]!); else url.searchParams.delete(key);
    }
    window.history.pushState(null,'',url.pathname+url.search);
  }
  const now=asOf;const day=86400000;
  const today=new Date(now+330*60000).toISOString().slice(0,10);
  const range=['TODAY','7D','30D','90D','CUSTOM'].includes(q.range||'')?q.range!:'30D';
  const todayStart=Date.parse(`${today}T00:00:00+05:30`);
  let from=range==='TODAY'?todayStart:todayStart-((range==='7D'?7:range==='90D'?90:30)-1)*day;
  let to=now;let invalidCustom=false;
  if(range==='CUSTOM') {
    const a=Date.parse(`${q.from}T00:00:00+05:30`),b=Date.parse(`${q.to}T23:59:59.999+05:30`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(q.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(q.to||'')||!Number.isFinite(a)||!Number.isFinite(b)||a>b||a>now||b-a>366*day) invalidCustom=true;
    else {from=a;to=Math.min(b,now);}
  }
  const duration=to-from+1;
  const inRange=(value:string)=>Date.parse(value)>=from&&Date.parse(value)<=to;
  const paid=data.orders.filter(order=>order.payment_status==='PAID'&&inRange(order.created_at));
  const previous=data.orders.filter(order=>order.payment_status==='PAID'&&Date.parse(order.created_at)>=from-duration&&Date.parse(order.created_at)<from);
  const paidIds=new Set(paid.map(order=>order.id));
  const used=data.tickets.filter(ticket=>paidIds.has(ticket.order_id)&&ticket.status==='USED');
  const revenue=paid.reduce((sum,order)=>sum+Number(order.subtotal),0);
  const sold=paid.reduce((sum,order)=>sum+Number(order.quantity),0);
  const activeVenues=new Set(data.venues.filter(venue=>venue.active).map(venue=>venue.id));
  const activeEvents=data.events.filter(event=>activeVenues.has(event.venue_id)&&event.published&&['live','upcoming'].includes(eventPhase(event,now)));
  const commission=settlements.filter(row=>inRange(row.created_at)).reduce((sum,row)=>sum+Number(row.commission_amount),0);
  const testCount=paid.filter(order=>order.razorpay_payment_id?.startsWith('test_payment_')).length;
  const countDays=Math.ceil((to-from+1)/day);
  const charts=Array.from({length:countDays},(_,i)=>{const a=from+i*day;const orders=paid.filter(order=>Date.parse(order.created_at)>=a&&Date.parse(order.created_at)<a+day);return {date:new Date(a+330*60000).toLocaleDateString('en-IN',{timeZone:'UTC',day:'numeric',month:'short'}),revenue:orders.reduce((sum,order)=>sum+Number(order.subtotal),0),tickets:orders.reduce((sum,order)=>sum+Number(order.quantity),0)};});
  const venueRows=data.venues.map(venue=>{
    const ids=new Set(data.events.filter(event=>event.venue_id===venue.id).map(event=>event.id));
    const orders=paid.filter(order=>ids.has(order.event_id));const old=previous.filter(order=>ids.has(order.event_id));
    const gross=orders.reduce((sum,order)=>sum+Number(order.subtotal),0),baseline=old.reduce((sum,order)=>sum+Number(order.subtotal),0),qty=orders.reduce((sum,order)=>sum+Number(order.quantity),0),entries=used.filter(ticket=>ids.has(ticket.event_id)).length;
    return {id:venue.id,href:`/admin/performance/${venue.id}`,gross,cells:[venue.name,money(gross),baseline?`${((gross-baseline)/baseline*100).toFixed(1)}%`:'No baseline',String(qty),String(entries),qty?`${(entries/qty*100).toFixed(1)}%`:'No sales',money(qty?gross/qty:0),String(activeEvents.filter(event=>event.venue_id===venue.id).length)]};
  }).sort((a,b)=>b.gross-a.gross);
  const eventRows=data.events.map(event=>{const orders=paid.filter(order=>order.event_id===event.id);const gross=orders.reduce((sum,order)=>sum+Number(order.subtotal),0);return {id:event.id,gross,href:`/admin/performance/${event.venue_id}`,cells:[event.name,data.venues.find(venue=>venue.id===event.venue_id)?.name||'Venue',money(gross),String(orders.reduce((sum,order)=>sum+Number(order.quantity),0)),String(used.filter(ticket=>ticket.event_id===event.id).length),event.published?eventPhase(event,now):'Draft']};}).filter(row=>row.gross>0||Number(row.cells[3])>0).sort((a,b)=>b.gross-a.gross);
  const promoterRows=data.sources.map(source=>{const ids=new Set(data.events.filter(event=>event.venue_id===source.venue_id).map(event=>event.id));const orders=paid.filter(order=>order.source_code===source.code&&ids.has(order.event_id));const orderIds=new Set(orders.map(order=>order.id));const qty=orders.reduce((sum,order)=>sum+Number(order.quantity),0),entries=used.filter(ticket=>orderIds.has(ticket.order_id)).length,gross=orders.reduce((sum,order)=>sum+Number(order.subtotal),0);return {id:source.id,gross,cells:[source.name,data.venues.find(venue=>venue.id===source.venue_id)?.name||'Venue',String(qty),money(gross),String(entries),money(promoterCommission(orders,Number(source.commission_percentage))),qty?`${(entries/qty*100).toFixed(1)}%`:'No sales']};}).filter(row=>Number(row.cells[2])>0).sort((a,b)=>b.gross-a.gross);
  const failed=data.orders.filter(order=>order.payment_status==='FAILED'&&inRange(order.created_at)).length;
  const pending=settlements.filter(row=>row.status==='PENDING').length;
  const alerts=[...(testCount?[`${testCount} paid test orders are included in this reporting period. No real money was collected for those orders.`]:[]),...(failed?[`${failed} failed payment orders recorded in this period.`]:[]),...(pending?[`${pending} settlement reports are pending across the network; estimates may be included.`]:[]),...(!activeEvents.length?['No upcoming or live published events at active venues.']:[])];
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">ARS / Network overview</p><h2 className="mt-3 text-3xl font-bold">Every venue. One perspective.</h2></div><Link href="/admin/compare" className="ars-button ars-button-secondary">Compare venues <ArrowUpRight size={15}/></Link></header>
    <section className="ars-card space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500"><span>Data loaded {new Date(asOf).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST / date filters update locally</span><button type="button" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())} className="min-h-10 text-[#e2d4ae]">{refreshing?'Refreshing data...':'Refresh latest data'}</button></div><nav className="flex flex-wrap gap-2" aria-label="Reporting period">{['TODAY','7D','30D','90D','CUSTOM'].map(value=><button type="button" key={value} onClick={()=>selectFilters(value==='CUSTOM'?{range:value,from:today,to:today}:{range:value})} aria-pressed={range===value} className={`ars-button !px-4 !py-2 !text-xs ${range===value?'':'ars-button-secondary'}`}>{value==='TODAY'?'Today':value==='CUSTOM'?'Custom':value}</button>)}</nav>{range==='CUSTOM'&&<form onSubmit={event=>{event.preventDefault();const values=new FormData(event.currentTarget);selectFilters({range:'CUSTOM',from:String(values.get('from')||''),to:String(values.get('to')||'')});}} className="flex flex-wrap items-end gap-3"><input type="hidden" name="range" value="CUSTOM"/><label className="text-xs text-zinc-400">From<input required type="date" name="from" max={today} defaultValue={q.from||today} className="ars-input mt-2"/></label><label className="text-xs text-zinc-400">To<input required type="date" name="to" max={today} defaultValue={q.to||today} className="ars-input mt-2"/></label><button className="ars-button">Apply dates</button></form>}{invalidCustom&&<p role="alert" className="text-sm text-amber-200">Choose valid dates spanning no more than 366 days. Showing the last 30 days until a valid range is selected.</p>}<p className="text-xs leading-6 text-zinc-500">{new Date(from).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})} to {new Date(to).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Revenue and tickets use paid bookings created in this period. Check-in rate uses those bookings' current used passes. Growth compares the preceding equal-duration period.</p></section>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">{[['Revenue',money(revenue),'Discounted ticket subtotal; excludes fees'],['ARS commission',money(commission),'Existing settlement reports dated in range; may include estimates'],['Tickets sold',String(sold),`${paid.length} paid orders`],['Check-in rate',sold?`${(used.length/sold*100).toFixed(1)}%`:'No sales',`${used.length} used passes in booking cohort`],['Active venues',String(activeVenues.size),'Current network snapshot'],['Active events',String(activeEvents.length),'Published upcoming/live events now']].map(([label,value,note])=><article key={label} className="border border-[#cbb88a]/20 bg-[linear-gradient(135deg,#19170f,#0b0b09)] p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p><p className="mt-4 break-words text-2xl font-bold tracking-tight text-[#e2d4ae]">{value}</p><p className="mt-3 text-[11px] leading-5 text-zinc-500">{note}</p></article>)}</div>
    <section className="ars-card p-5 sm:p-7"><h2 className="mb-5 text-sm font-bold uppercase tracking-widest">Network Revenue & Ticket Sales</h2><NetworkSalesChart rows={charts}/></section>
    <Table title="Venue Performance" columns={['Venue','Revenue','Growth','Tickets','Check-ins','Attendance','Avg ticket','Active events']} rows={venueRows}/>
    <p className="text-xs text-zinc-500">Venue drill-down pages have their own 7/30/90-day controls. Current event and venue counts do not change with the booking date filter.</p>
    <Table title="Revenue by event" columns={['Event','Venue','Revenue','Tickets','Check-ins','Current status']} rows={eventRows}/>
    <Table title="Top promoters" columns={['Promoter','Venue','Tickets','Revenue','Check-ins','Commission','Entry conversion']} rows={promoterRows}/>
    <p className="text-xs leading-6 text-zinc-500">Entry conversion means checked-in passes / sold tickets, not referral click-to-purchase conversion. Promoter commission follows the existing saved-rate and rounding rules.</p>
    <section className="ars-card p-5 sm:p-7"><h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><Activity size={17} className="text-[#cbb88a]"/>Operations / Alerts</h2>{alerts.length?alerts.map(alert=><p key={alert} className="mb-3 border-l-2 border-[#cbb88a] pl-4 text-sm leading-6 text-zinc-300">{alert}</p>):<p className="text-sm text-zinc-500">No issues detected by these reporting checks.</p>}<div className="mt-5 flex flex-wrap gap-4 text-xs text-[#e2d4ae]"><Link href="/admin/tickets">Review orders</Link><Link href="/admin/settlements">Review settlements</Link><Link href="/admin/events">Manage events</Link><Link href="/admin/promoters">Manage promoters</Link></div></section>
  </div>;
}
