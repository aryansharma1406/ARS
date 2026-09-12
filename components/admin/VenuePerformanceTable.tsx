'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {PerformanceData} from '@/lib/admin-performance';

type Filters={days?:string;range?:string;from?:string;to?:string};
const DAY=86400000;
const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(value);
const dateLabel=(value:number)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(value);

export default function VenuePerformanceTable({data,initial,asOf}:{data:PerformanceData;initial:Filters;asOf:number}) {
  const [filters,setFilters]=useState(initial);
  const [error,setError]=useState('');
  const today=new Date(asOf+330*60000).toISOString().slice(0,10);
  const days=['7','30','90'].includes(filters.days||'')?Number(filters.days):30;
  const range=filters.range==='TODAY'?'TODAY':filters.range==='CUSTOM'?'CUSTOM':String(days);
  let end=asOf;
  let start=range==='TODAY'?Date.parse(`${today}T00:00:00+05:30`):asOf-days*DAY;
  if(range==='CUSTOM') {
    const a=Date.parse(`${filters.from}T00:00:00+05:30`);
    const b=Math.min(asOf,Date.parse(`${filters.to}T23:59:59.999+05:30`));
    if(Number.isFinite(a)&&Number.isFinite(b)&&a<=b&&b-a<=366*DAY){start=a;end=b;}
  }
  function select(next:Filters) {
    setFilters(next);setError('');
    const url=new URL(window.location.href);
    for(const key of ['days','range','from','to'] as const) {
      if(next[key])url.searchParams.set(key,next[key]!);else url.searchParams.delete(key);
    }
    window.history.pushState(null,'',url.pathname+url.search);
  }
  useEffect(()=>{
    const restore=()=>{
      const q=new URLSearchParams(window.location.search);
      setFilters({days:q.get('days')||undefined,range:q.get('range')||undefined,from:q.get('from')||undefined,to:q.get('to')||undefined});
      setError('');
    };
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[]);
  const duration=Math.max(1,end-start);
  const rows=data.venues.map(venue=>{
    const events=data.events.filter(event=>event.venue_id===venue.id);
    const eventIds=new Set(events.map(event=>event.id));
    const paid=data.orders.filter(order=>eventIds.has(order.event_id)&&order.payment_status==='PAID');
    const orders=paid.filter(order=>Date.parse(order.created_at)>=start&&Date.parse(order.created_at)<=end);
    const previous=paid.filter(order=>Date.parse(order.created_at)>=start-duration&&Date.parse(order.created_at)<start);
    const ids=new Set(orders.map(order=>order.id));
    const used=data.tickets.filter(ticket=>ids.has(ticket.order_id)&&ticket.status==='USED').length;
    const revenue=orders.reduce((sum,order)=>sum+Number(order.subtotal),0);
    const prior=previous.reduce((sum,order)=>sum+Number(order.subtotal),0);
    const sold=orders.reduce((sum,order)=>sum+Number(order.quantity),0);
    const buckets=Array<number>(12).fill(0);
    for(const order of orders) buckets[Math.min(11,Math.floor((Date.parse(order.created_at)-start)/duration*12))]+=Number(order.subtotal);
    return {venue,revenue,sold,used,growth:prior>0?(revenue-prior)/prior*100:null,average:sold?revenue/sold:0,attendance:sold?used/sold*100:null,events:new Set(orders.map(order=>order.event_id)).size,buckets};
  }).sort((a,b)=>b.revenue-a.revenue||a.venue.name.localeCompare(b.venue.name));
  return <section className="ars-card min-w-0 p-5 sm:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p className="eyebrow">Network intelligence</p><div className="mt-2 flex items-center gap-3"><h2 className="text-2xl font-bold">Venue Performance</h2>
        <div className="group relative"><button type="button" aria-label="About venue performance metrics" aria-describedby="venue-metric-info" className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e2d4ae]/40 text-xs text-[#e2d4ae] focus-visible:outline focus-visible:outline-2">i</button>
          <div id="venue-metric-info" role="tooltip" className="pointer-events-none invisible absolute -left-40 top-8 z-20 w-72 rounded-lg border border-[#e2d4ae]/30 bg-[#171610] p-4 text-xs leading-6 text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">Revenue uses paid bookings created in the selected period, after discounts and excluding fees. Existing test bookings remain included. Growth compares the preceding equal-duration period. Attendance is used passes divided by tickets sold in that booking cohort, not occupancy. Average ticket value is revenue divided by tickets sold. Events counts events with paid bookings in range. Trends show 12 equal time buckets. Today and Custom use IST; other presets use rolling days. Detail pages have their own date filters.</div>
        </div></div></div>
      <Link href={`/admin/compare?days=${days}`} className="ars-button ars-button-secondary">Compare venues</Link>
    </div>
    <div className="mb-6 border-b border-white/10 pb-5">
      <div className="flex flex-wrap gap-2">{['TODAY','7','30','90','CUSTOM'].map(value=><button type="button" key={value} aria-pressed={range===value} onClick={()=>select(value==='TODAY'?{range:value}:value==='CUSTOM'?{range:value,from:today,to:today}:{days:value})} className={`ars-button !px-4 !py-2 !text-xs ${range===value?'':'ars-button-secondary'}`}>{value==='TODAY'?'Today':value==='CUSTOM'?'Custom':`${value}D`}</button>)}</div>
      {range==='CUSTOM'&&<form key={`${filters.from}-${filters.to}`} className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event=>{
        event.preventDefault();const form=new FormData(event.currentTarget);const from=String(form.get('from'));const to=String(form.get('to'));
        const a=Date.parse(`${from}T00:00:00+05:30`);const b=Date.parse(`${to}T23:59:59.999+05:30`);
        if(!Number.isFinite(a)||!Number.isFinite(b)||a>b||a>asOf||b-a>366*DAY){setError('Choose a valid date range of up to 366 days.');return;}
        select({range:'CUSTOM',from,to});
      }}><label className="text-xs text-zinc-400">From<input type="date" name="from" required max={today} defaultValue={filters.from||today} className="mt-2 block rounded border border-white/20 bg-black p-2 text-white [color-scheme:dark]"/></label><label className="text-xs text-zinc-400">To<input type="date" name="to" required max={today} defaultValue={filters.to||today} className="mt-2 block rounded border border-white/20 bg-black p-2 text-white [color-scheme:dark]"/></label><button className="ars-button ars-button-secondary !px-4 !py-2">Apply dates</button></form>}
      {error&&<p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
      <p className="mt-4 text-xs text-zinc-500">{dateLabel(start)} to {dateLabel(end)} IST <span className="px-2">/</span> Ranked by revenue</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr>{['Venue','Revenue','Growth','Tickets Sold','Check-ins','Attendance','Avg Ticket Value','Events'].map(label=><th key={label} scope="col" className="border-b border-white/10 px-3 py-4 text-[10px] uppercase tracking-widest text-zinc-500">{label}</th>)}</tr></thead>
      <tbody>{rows.map((r,index)=>{
        const href=`/admin/performance/${r.venue.id}?days=${days}`;
        const max=Math.max(1,...r.buckets);
        const points=r.buckets.map((value,i)=>`${2+i*9},${25-value/max*22}`).join(' ');
        const values=[<div key="venue" className="flex items-center gap-3"><span className={`text-xs tabular-nums ${index<3?'text-[#e2d4ae]':'text-zinc-500'}`}>#{index+1}</span><div><span className="font-semibold text-[#e2d4ae]">{r.venue.name}</span><p className="mt-1 text-xs text-zinc-500">{r.venue.active?'Active':'Inactive'}</p></div></div>,<div key="revenue"><span>{money(r.revenue)}</span><svg viewBox="0 0 103 28" role="img" aria-label={`Revenue trend: ${r.buckets.map(value=>money(value)).join(', ')}`} className="mt-2 h-7 w-24 text-[#e2d4ae]/65"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg></div>,<span key="growth" className={r.growth!==null&&r.growth<0?'text-amber-200':'text-[#e2d4ae]'}>{r.growth===null?'No baseline':`${r.growth>=0?'+':''}${r.growth.toFixed(1)}%`}</span>,r.sold,r.used,r.attendance===null?'No sales':`${r.attendance.toFixed(1)}%`,money(r.average),r.events];
        return <tr key={r.venue.id} className="border-b border-white/5 transition-colors hover:bg-[#e2d4ae]/[.045] focus-within:bg-[#e2d4ae]/[.045]">{values.map((value,i)=><td key={i} className="p-0"><Link href={href} tabIndex={i===0?0:-1} aria-label={i===0?`View analytics for ${r.venue.name}`:undefined} className="flex min-h-24 items-center px-3 py-4 outline-offset-[-2px]">{value}</Link></td>)}</tr>;
      })}</tbody></table></div>
    {!rows.length&&<p className="p-8 text-center text-zinc-400">No venues available.</p>}
  </section>;
}
