'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {defaultUpiFilters,type UpiFilters,type UpiReport,type UpiStatus} from '@/lib/admin-upi-types';
import {paymentLabel,paymentMoney,paymentTime} from '@/lib/manual-upi';
import AdminUpiDrawer from '@/components/AdminUpiDrawer';

const tabs:{id:UpiStatus;label:string}[]=[{id:'pending',label:'Pending Approval'},{id:'approved',label:'Approved'},{id:'rejected',label:'Rejected'},{id:'expired',label:'Expired'},{id:'all',label:'All'}];
const queryFor=(filters:UpiFilters)=>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>params.set(key,String(value)));return params;};
const time=(value:string|null|undefined)=>value?paymentTime(value)+' IST':'Not recorded';

export default function AdminUpiVerification(){
 const [filters,setFilters]=useState<UpiFilters>(defaultUpiFilters);
 const [report,setReport]=useState<UpiReport|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [pdfExporting,setPdfExporting]=useState(false);
 const [refresh,setRefresh]=useState(0);const [selected,setSelected]=useState<string|null>(null);
 const [minutes,setMinutes]=useState('60');const [saving,setSaving]=useState(false);const [exporting,setExporting]=useState(false);const [notice,setNotice]=useState('');
 function change(patch:Partial<UpiFilters>){setFilters(previous=>({...previous,...patch,page:0}));}
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  const timer=window.setTimeout(async()=>{
   try{
    const response=await fetch('/api/admin/upi-report?'+queryFor(filters),{cache:'no-store',signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load payments.');
    if(!controller.signal.aborted)setReport(result);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load payments.');}
   finally{if(!controller.signal.aborted)setLoading(false);}
  },250);
  return()=>{window.clearTimeout(timer);controller.abort();};
 },[filters,refresh]);
 useEffect(()=>{const timer=window.setInterval(()=>setRefresh(value=>value+1),30000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(report)setMinutes(String(report.holdMinutes));},[report?.holdMinutes]);
 async function saveHold(){
  setSaving(true);setError('');setNotice('');
  try{const response=await fetch('/api/admin/manual-upi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({holdMinutes:Number(minutes)})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to save hold.');setNotice('Hold duration saved. Existing deadlines are unchanged.');setRefresh(value=>value+1);}
  catch(e){setError(e instanceof Error?e.message:'Unable to save hold.');}finally{setSaving(false);}
 }
 async function exportCsv(){
  setExporting(true);setError('');
  try{
   const params=queryFor(filters);params.set('format','csv');
   const response=await fetch('/api/admin/upi-report?'+params,{cache:'no-store'});
   if(!response.ok){const result=await response.json();throw new Error(result.error||'Export failed.');}
   const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='ARS-UPI-payments.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e instanceof Error?e.message:'Export failed.');}finally{setExporting(false);}
 }
 async function exportPdf(){
  setPdfExporting(true);setError('');
  const selectedFilters={...filters};
  try{
   const params=queryFor(selectedFilters);params.set('format','pdf-data');
   const response=await fetch('/api/admin/upi-report?'+params,{cache:'no-store'});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'PDF export failed.');
   const {downloadUpiPaymentPdf}=await import('@/lib/upi-payment-pdf');
   downloadUpiPaymentPdf(result as UpiReport,selectedFilters);
  }catch(e){setError(e instanceof Error?e.message:'PDF export failed.');}finally{setPdfExporting(false);}
 }
 const pages=Math.max(1,Math.ceil((report?.total||0)/filters.size));
 return <section className="space-y-5">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">ARS / Secure payments</p><h1 className="mt-3 text-3xl">UPI Payment Verification</h1><p className="mt-2 text-sm text-zinc-400">Match the UTR and exact amount against your receiving account before approval.</p></div><div className="flex flex-wrap gap-2"><button disabled={loading||exporting||pdfExporting||!report} onClick={()=>void exportCsv()} className="ars-button ars-button-secondary !px-4 !py-3 !text-xs">{exporting?'Exporting CSV...':'Export filtered CSV'}</button><button disabled={loading||exporting||pdfExporting||!report} onClick={()=>void exportPdf()} className="ars-button !px-4 !py-3 !text-xs">{pdfExporting?'Preparing PDF...':'Export PDF'}</button></div></header>
  <nav aria-label="Payment status filters" className="grid grid-cols-2 gap-2 border border-[#cbb88a]/30 bg-[#cbb88a]/5 p-2 sm:grid-cols-5">{tabs.map(tab=><button key={tab.id} type="button" aria-pressed={filters.status===tab.id} onClick={()=>change({status:tab.id,sort:tab.id==='pending'?'expiring':'newest'})} className={`min-h-12 px-3 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbb88a] ${filters.status===tab.id?'bg-[#e2d4ae] text-black':'text-[#e2d4ae] hover:bg-white/10'}`}>{tab.label}<span className="ml-2 tabular-nums">{report&&!loading?`(${report.counts[tab.id]})`:''}</span></button>)}</nav>
  <section aria-label="Search and payment filters" className="ars-card space-y-4 p-4">
   <label className="block"><span className="ars-label">Search payments</span><input type="search" value={filters.q} maxLength={100} onChange={e=>change({q:e.target.value})} placeholder="UTR, Order ID, customer name/email/phone, event or ticket ID" className="ars-input"/></label>
   <div className="flex flex-wrap gap-2" aria-label="Submission date range">{['ALL','TODAY','7D','30D','90D','CUSTOM'].map(value=><button type="button" key={value} aria-pressed={filters.range===value} onClick={()=>change({range:value})} className={`ars-button !px-3 !py-2 !text-xs ${filters.range===value?'':'ars-button-secondary'}`}>{value==='ALL'?'All time':value==='TODAY'?'Today':value==='CUSTOM'?'Custom':value}</button>)}</div>
   {filters.range==='CUSTOM'&&<div className="grid gap-3 sm:grid-cols-2"><label><span className="ars-label">Submitted from (IST)</span><input type="date" className="ars-input [color-scheme:dark]" value={filters.from} onChange={e=>change({from:e.target.value})}/></label><label><span className="ars-label">Submitted through (IST)</span><input type="date" className="ars-input [color-scheme:dark]" value={filters.to} onChange={e=>change({to:e.target.value})}/></label></div>}
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <label><span className="ars-label">Venue</span><select className="ars-select" value={filters.venue} onChange={e=>change({venue:e.target.value,event:''})}><option value="">All venues</option>{report?.options.venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    <label><span className="ars-label">Event</span><select className="ars-select" value={filters.event} onChange={e=>change({event:e.target.value})}><option value="">All events</option>{report?.options.events.filter(e=>!filters.venue||e.venue_id===filters.venue).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
    <label><span className="ars-label">Approver / reviewer</span><select className="ars-select" value={filters.approver} onChange={e=>change({approver:e.target.value})}><option value="">All reviewers</option>{report?.options.approvers.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    <label><span className="ars-label">Minimum amount (INR)</span><input type="number" min="0" step="0.01" value={filters.min} onChange={e=>change({min:e.target.value})} className="ars-input" placeholder="No minimum"/></label>
    <label><span className="ars-label">Maximum amount (INR)</span><input type="number" min="0" step="0.01" value={filters.max} onChange={e=>change({max:e.target.value})} className="ars-input" placeholder="No maximum"/></label>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-4 text-xs text-[#e2d4ae]"><button onClick={()=>setFilters({...defaultUpiFilters})}>Reset filters</button><button onClick={()=>setRefresh(value=>value+1)}>Refresh</button><Link href="/admin/tickets">Tickets & Orders</Link></div><label className="flex items-center gap-3 text-xs text-zinc-400">Sort<select className="ars-select !w-auto" value={filters.sort} onChange={e=>change({sort:e.target.value})}>{[['expiring','Expiring Soon'],['newest','Newest'],['oldest','Oldest'],['highest','Highest Amount'],['lowest','Lowest Amount'],['approved','Recently Approved']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
  </section>
  <p className="text-xs leading-6 text-zinc-500">Dates filter UTR submission time in IST. Status counts follow the other filters. Pending defaults to nearest hold expiry. Only submitted references appear; no-reference orders remain in Tickets & Orders.</p>
  {error&&<p role="alert" className="border border-red-400/30 p-4 text-sm text-red-300">{error}</p>}{notice&&<p role="status" className="text-sm text-[#e2d4ae]">{notice}</p>}
  <div className="ars-card overflow-x-auto" aria-busy={loading}><table className="w-full min-w-[1150px] text-left text-xs"><thead className="bg-white/[.03]"><tr>{['Customer / Order','Event / Venue','Amount','UTR','Submitted (IST)','Status','Hold / Review (IST)','Action'].map(label=><th scope="col" key={label} className="border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-500">{label}</th>)}</tr></thead><tbody>
   {loading?<tr><td colSpan={8} className="p-8 text-center text-zinc-400" role="status">Loading payments...</td></tr>:error?<tr><td colSpan={8} className="p-8 text-center text-zinc-400">Unable to show the current results. Adjust filters or retry.</td></tr>:!report?.rows.length?<tr><td colSpan={8} className="p-8 text-center text-zinc-400">No payments match these filters.</td></tr>:report.rows.map(row=><tr key={row.id} onClick={()=>setSelected(row.id)} className="cursor-pointer border-b border-white/5 hover:bg-[#cbb88a]/5"><td className="px-4 py-3"><button className="text-left font-semibold text-[#e2d4ae] underline underline-offset-4" onClick={()=>setSelected(row.id)}>{row.customer_name}</button><p className="mt-1 text-zinc-400">{row.customer_email}</p><p className="mt-1 text-zinc-500">{row.customer_phone}</p><p className="mt-1 font-mono text-[10px] text-zinc-500" title={row.id}>{row.id.slice(0,8)}...{row.id.slice(-4)}</p></td><td className="px-4 py-3"><p>{row.event_name}</p><p className="mt-1 text-zinc-500">{row.venue_name}</p></td><td className="whitespace-nowrap px-4 py-3 font-semibold text-[#e2d4ae]">{paymentMoney(row.total)}</td><td className="max-w-40 break-all px-4 py-3 font-mono">{row.utr}</td><td className="px-4 py-3 text-zinc-400">{time(row.submitted_at)}</td><td className="px-4 py-3"><span className={`inline-block border px-2 py-1 text-[10px] ${row.state==='VERIFIED'?'border-emerald-400/30 text-emerald-300':row.state==='PENDING'?'border-[#cbb88a]/40 text-[#e2d4ae]':'border-white/15 text-zinc-400'}`}>{paymentLabel(row.state)}</span></td><td className="px-4 py-3 text-zinc-400">{row.state==='PENDING'||row.state==='EXPIRED'?time(row.expires_at):time(row.reviewed_at)}{row.reviewer_name&&<p className="mt-1 text-zinc-500">{row.reviewer_name}</p>}</td><td className="px-4 py-3"><button className="text-[#e2d4ae] underline underline-offset-4" onClick={()=>setSelected(row.id)}>{row.state==='PENDING'?'Review / Approve':'Details'}</button></td></tr>)}
  </tbody></table></div>
  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400"><p role="status">{loading?'Loading...':`${report?.total||0} matching payments`}</p><div className="flex items-center gap-3"><select aria-label="Payments per page" className="ars-select !w-auto" value={filters.size} onChange={e=>change({size:Number(e.target.value)})}>{[25,50,100].map(value=><option key={value} value={value}>{value} per page</option>)}</select><button disabled={loading||filters.page===0} className="disabled:opacity-30" onClick={()=>setFilters(previous=>({...previous,page:previous.page-1}))}>Previous</button><span>{filters.page+1} / {pages}</span><button disabled={loading||filters.page+1>=pages} className="disabled:opacity-30" onClick={()=>setFilters(previous=>({...previous,page:previous.page+1}))}>Next</button></div></div>
  <details className="ars-card p-4"><summary className="cursor-pointer text-sm text-[#e2d4ae]">Verification hold settings {report?`(${report.holdMinutes} minutes)`:''}</summary><form onSubmit={e=>{e.preventDefault();void saveHold();}} className="mt-4 space-y-3"><p className="text-xs text-zinc-400">Applies only to new UTR submissions. Existing deadlines are unchanged.</p><label className="ars-label" htmlFor="admin-hold-minutes">Minutes (5-1440)</label><div className="flex flex-wrap gap-3"><input id="admin-hold-minutes" type="number" min={5} max={1440} required className="ars-input !w-36" value={minutes} onChange={e=>setMinutes(e.target.value)}/><button disabled={saving||!report} className="ars-button !text-xs">Save hold duration</button></div></form></details>
  {selected&&<AdminUpiDrawer orderId={selected} onClose={()=>setSelected(null)} onUpdated={()=>setRefresh(value=>value+1)}/>}
 </section>;
}
