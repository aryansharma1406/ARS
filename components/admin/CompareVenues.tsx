'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {PerformanceData} from '@/lib/admin-performance';

type Query={days?:string;range?:string;from?:string;to?:string;venue?:string|string[]};
type Selection={range:string;from:string;to:string;ids:string[]};
const DAY=86400000;
const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const stamp=(value:number)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(value);
const percent=(value:number)=>`${value.toFixed(1)}%`;

export default function CompareVenues({data,initial,asOf}:{data:PerformanceData;initial:Query;asOf:number}) {
  const today=new Date(asOf+330*60000).toISOString().slice(0,10);
  function parse(q:Query):Selection {
    const supplied=q.range||q.days||'30';
    const ids=Array.isArray(q.venue)?q.venue:q.venue?[q.venue]:data.venues.map(v=>v.id);
    return {range:['7','30','90','12M','CUSTOM'].includes(supplied)?supplied:'30',from:q.from||today,to:q.to||today,ids:ids.filter(id=>data.venues.some(v=>v.id===id))};
  }
  const [draft,setDraft]=useState<Selection>(()=>parse(initial));
  const [applied,setApplied]=useState<Selection>(()=>parse(initial));
  const [error,setError]=useState('');
  useEffect(()=>{
    const restore=()=>{const q=new URLSearchParams(window.location.search);const next=parse({days:q.get('days')||undefined,range:q.get('range')||undefined,from:q.get('from')||undefined,to:q.get('to')||undefined,venue:q.has('venue')?q.getAll('venue'):undefined});setDraft(next);setApplied(next);setError('');};
    window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
  // The authorized dataset remains fixed for this page snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  function windowFor(selection:Selection) {
    let end=asOf;let start=asOf-Number(selection.range)*DAY;
    if(selection.range==='12M') {const date=new Date(asOf);const day=date.getUTCDate();date.setUTCDate(1);date.setUTCFullYear(date.getUTCFullYear()-1);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));start=date.getTime();}
    if(selection.range==='CUSTOM') {start=Date.parse(`${selection.from}T00:00:00+05:30`);end=Math.min(asOf,Date.parse(`${selection.to}T23:59:59.999+05:30`));}
    return {start,end};
  }
  const requested=windowFor(applied);
  const valid=Number.isFinite(requested.start)&&Number.isFinite(requested.end)&&requested.start<=requested.end&&requested.end-requested.start<=366*DAY;
  const {start,end}=valid?requested:{start:asOf-30*DAY,end:asOf};
  const duration=Math.max(1,end-start);
  const reports=data.venues.filter(v=>applied.ids.includes(v.id)).map(venue=>{
    const events=data.events.filter(e=>e.venue_id===venue.id);const eventIds=new Set(events.map(e=>e.id));
    const paid=data.orders.filter(o=>eventIds.has(o.event_id)&&o.payment_status==='PAID');
    const orders=paid.filter(o=>Date.parse(o.created_at)>=start&&Date.parse(o.created_at)<=end);
    const previous=paid.filter(o=>Date.parse(o.created_at)>=start-duration&&Date.parse(o.created_at)<start);
    const orderMap=new Map(orders.map(o=>[o.id,o]));
    const used=data.tickets.filter(t=>t.status==='USED'&&orderMap.has(t.order_id));
    const visits=new Map<string,Set<string>>();
    for(const ticket of used){const id=orderMap.get(ticket.order_id)?.customer_id;if(!id)continue;if(!visits.has(id))visits.set(id,new Set());visits.get(id)!.add(ticket.event_id);}
    const revenue=orders.reduce((sum,o)=>sum+Number(o.subtotal),0);const prior=previous.reduce((sum,o)=>sum+Number(o.subtotal),0);const sold=orders.reduce((sum,o)=>sum+Number(o.quantity),0);
    return {venue,revenue,sold,checkins:used.length,attendance:sold?used.length/sold*100:null,growth:prior>0?(revenue-prior)/prior*100:null,average:sold?revenue/sold:null,customers:new Set(orders.map(o=>o.customer_id).filter(Boolean)).size,repeat:visits.size?[...visits.values()].filter(events=>events.size>1).length/visits.size*100:null,events:new Set(orders.map(o=>o.event_id)).size};
  });
  type Report=typeof reports[number];
  const metrics:{key:keyof Omit<Report,'venue'>;label:string;format:(n:number)=>string;empty?:string}[]=[
    {key:'revenue',label:'Revenue',format:money},{key:'sold',label:'Tickets Sold',format:String},{key:'checkins',label:'Check-ins',format:String},
    {key:'attendance',label:'Attendance',format:percent,empty:'No sales'},{key:'growth',label:'Growth',format:n=>`${n>=0?'+':''}${percent(n)}`,empty:'No baseline'},
    {key:'average',label:'Avg Ticket Value',format:money,empty:'No sales'},{key:'customers',label:'Customers',format:String},{key:'repeat',label:'Repeat Attendance %',format:percent,empty:'No attendance'},{key:'events',label:'Events',format:String}
  ];
  function best(key:typeof metrics[number]['key']){const values=reports.map(r=>r[key]).filter((v):v is number=>v!==null);return values.length?Math.max(...values):null;}
  function compare(){
    const w=windowFor(draft);
    if(!draft.ids.length){setError('Select at least one venue to compare.');return;}
    if(!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start>w.end||w.end-w.start>366*DAY){setError('Choose a valid date range of up to 366 days.');return;}
    setApplied({...draft,ids:[...draft.ids]});setError('');
    const url=new URL(window.location.href);for(const key of ['days','range','from','to','venue'])url.searchParams.delete(key);
    if(['7','30','90'].includes(draft.range))url.searchParams.set('days',draft.range);else url.searchParams.set('range',draft.range);
    if(draft.range==='CUSTOM'){url.searchParams.set('from',draft.from);url.searchParams.set('to',draft.to);}
    draft.ids.forEach(id=>url.searchParams.append('venue',id));window.history.pushState(null,'',url.pathname+url.search);
  }
  function exportReport(){
    const rows=[['ARS Venue Comparison'],['Period (IST)',stamp(start),stamp(end)],['Metric',...reports.map(r=>r.venue.name)],...metrics.map(m=>[m.label,...reports.map(r=>r[m.key]===null?m.empty||'Unavailable':m.format(r[m.key]!))]),['Definitions','Paid ticket revenue after discounts, excluding fees. Existing test bookings included. Attendance uses paid booking cohort. Repeat attendance is customers checked into two or more distinct events divided by customers checked in, within this booking cohort. Events have paid bookings in range. Growth compares preceding equal-duration period.']];
    const csv=rows.map(row=>row.map(value=>{let text=String(value);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=`ARS-venue-comparison-${today}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const pending=JSON.stringify(draft)!==JSON.stringify(applied);
  return <div className="space-y-8">
    <header><p className="eyebrow">ARS / Network intelligence</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Compare Venues</h1><p className="mt-3 text-sm text-zinc-400">One reporting window. Every venue in perspective.</p></header>
    <section className="ars-card space-y-5 p-5 sm:p-7"><div className="flex flex-wrap gap-2">{['7','30','90','12M','CUSTOM'].map(range=><button key={range} type="button" aria-pressed={draft.range===range} onClick={()=>setDraft({...draft,range})} className={`ars-button !px-4 !py-2 !text-xs ${draft.range===range?'':'ars-button-secondary'}`}>{range==='CUSTOM'?'Custom':range==='12M'?'12M':`${range}D`}</button>)}</div>
      {draft.range==='CUSTOM'&&<div className="flex flex-wrap gap-4">{(['from','to'] as const).map(key=><label key={key} className="text-xs capitalize text-zinc-400">{key}<input type="date" max={today} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} className="mt-2 block rounded border border-white/20 bg-black p-3 text-white [color-scheme:dark]"/></label>)}</div>}
      <fieldset><legend className="mb-3 text-xs uppercase tracking-widest text-zinc-400">Select venues</legend><div className="flex flex-wrap gap-2">{data.venues.map(venue=><button type="button" key={venue.id} aria-pressed={draft.ids.includes(venue.id)} onClick={()=>setDraft({...draft,ids:draft.ids.includes(venue.id)?draft.ids.filter(id=>id!==venue.id):[...draft.ids,venue.id]})} className={`rounded border px-4 py-3 text-sm transition-colors ${draft.ids.includes(venue.id)?'border-[#cbb88a] bg-[#cbb88a]/10 text-[#e2d4ae]':'border-white/15 text-zinc-400 hover:border-white/40'}`}>{venue.name}</button>)}<button type="button" onClick={()=>setDraft({...draft,ids:data.venues.map(v=>v.id)})} className="px-4 py-3 text-sm text-[#e2d4ae] underline underline-offset-4">Select All</button></div></fieldset>
      <div className="flex flex-wrap items-center gap-4"><button type="button" onClick={compare} disabled={!data.venues.length} className="ars-button disabled:opacity-40">Compare</button>{pending&&<p className="text-xs text-zinc-400">Selection changed. Compare to update results.</p>}</div>{error&&<p role="alert" className="text-sm text-amber-200">{error}</p>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-400">{stamp(start)} to {stamp(end)} IST / {reports.length} venues</p><details className="max-w-2xl text-xs leading-6 text-zinc-400"><summary className="cursor-pointer text-[#e2d4ae]">About these metrics</summary><p className="mt-2">Revenue is paid ticket subtotal after discounts, excluding fees. Existing test bookings remain included. Attendance counts used passes from bookings created in this window, not occupancy. Repeat attendance compares customers attending two or more distinct events with all attending customers in this booking cohort. Events counts events with paid bookings in range. Growth compares the preceding equal-duration period. Presets are rolling periods; custom dates use IST. Tied leaders are all highlighted; zero-only metrics have no winner. Venue detail pages have independent date filters.</p></details></div>
    {!reports.length?<div className="ars-card p-12 text-center text-zinc-400">No venues selected. Choose venues above to build your comparison.</div>:<>
      <section><h2 className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-zinc-400">Best Performers</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{['revenue','sold','attendance','growth'].map(key=>{const m=metrics.find(m=>m.key===key)!;const top=best(m.key);const winners=top!==null&&top!==0?reports.filter(r=>r[m.key]===top):[];return <div key={key} className="ars-card border-t border-t-[#cbb88a]/50 bg-gradient-to-br from-[#cbb88a]/[.08] to-transparent p-6"><p className="text-xs uppercase tracking-widest text-zinc-400">{key==='sold'?'Most Tickets':`Best ${m.label}`}</p><p className="mt-4 break-words text-3xl font-semibold tabular-nums text-[#e2d4ae]">{top===null?'N/A':m.format(top)}</p><p className="mt-3 text-sm text-zinc-400">{winners.length?winners.map(r=>r.venue.name).join(' / '):top===null?m.empty:'No activity'}</p></div>;})}</div></section>
      <section className="ars-card p-5 sm:p-7"><h2 className="text-xl font-semibold">Venue Performance</h2><div className="mt-6 grid gap-8 lg:grid-cols-2">{['revenue','sold','attendance','growth'].map(key=>{const m=metrics.find(m=>m.key===key)!;const magnitude=Math.max(1,...reports.map(r=>Math.abs(r[m.key]||0)));return <div key={key}><h3 className="mb-5 text-xs uppercase tracking-widest text-zinc-400">{m.label} Comparison</h3><div className="space-y-4">{[...reports].sort((a,b)=>(b[m.key]??-Infinity)-(a[m.key]??-Infinity)).map(r=>{const value=r[m.key];return <div key={r.venue.id}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="truncate">{r.venue.name}</span><span className="shrink-0 tabular-nums text-[#e2d4ae]">{value===null?m.empty:m.format(value)}</span></div><div className="relative h-3 overflow-hidden rounded-sm bg-white/5" role="img" aria-label={`${r.venue.name}: ${value===null?m.empty:m.format(value)}`}><div style={{width:`${value===null?0:Math.abs(value)/magnitude*100}%`}} className={`h-full rounded-sm ${value!==null&&value<0?'bg-amber-700/70':'bg-gradient-to-r from-[#8c7b50] to-[#e2d4ae]'}`}/></div></div>;})}</div>{key==='growth'&&<p className="mt-3 text-[11px] text-zinc-500">Bar length represents magnitude; amber indicates a decline.</p>}</div>;})}</div></section>
      <section className="ars-card min-w-0 p-5 sm:p-7"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Detailed Comparison</h2><button type="button" className="ars-button ars-button-secondary !px-4 !py-2 !text-xs" onClick={exportReport}>Export Comparison</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="min-w-44 border-b border-white/10 p-4 text-xs uppercase tracking-widest text-zinc-500">Metric</th>{reports.map(r=><th scope="col" key={r.venue.id} className="min-w-44 border-b border-white/10 p-4"><Link className="text-[#e2d4ae] hover:underline" href={`/admin/performance/${r.venue.id}?days=${['7','30','90'].includes(applied.range)?applied.range:30}`}>{r.venue.name}<span aria-hidden="true" className="ml-2">↗</span></Link></th>)}</tr></thead><tbody>{metrics.map(m=>{const top=best(m.key);return <tr key={m.key} className="border-b border-white/5 hover:bg-white/[.02]"><th scope="row" className="p-4 font-normal text-zinc-400">{m.label}</th>{reports.map(r=>{const value=r[m.key];const winner=top!==null&&top!==0&&value===top;return <td key={r.venue.id} className={`p-4 tabular-nums ${winner?'bg-[#cbb88a]/[.045] text-[#e2d4ae]':'text-zinc-300'}`}>{value===null?m.empty:m.format(value)}{winner&&<span className="ml-2 inline-block rounded-full border border-[#cbb88a]/30 px-2 py-0.5 text-[9px] uppercase tracking-wide" aria-label="Best performer">Best</span>}</td>;})}</tr>;})}</tbody></table></div></section>
    </>}
  </div>;
}
