'use client';
import UpiAppPicker from '@/components/UpiAppPicker';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {UPI_ID,UPI_PAYEE,UPI_QR,paymentLabel,paymentMoney,paymentTime,type ManualPayment,type ManualPayments,type PaymentQueue} from '@/lib/manual-upi';

const queueTabs:{id:PaymentQueue;label:string}[]=[{id:'pending',label:'Pending Approval'},{id:'approved',label:'Approved'},{id:'rejected',label:'Rejected'},{id:'expired',label:'Expired'}];

export default function ManualUpiPayments({admin=false,orderId}:{admin?:boolean;orderId?:string}){
 const [data,setData]=useState<ManualPayments|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [page,setPage]=useState(0);const [busy,setBusy]=useState(false);const [minutes,setMinutes]=useState('60');
 const [queue,setQueue]=useState<PaymentQueue>('pending');
 const requestSequence=useRef(0);
 const endpoint=admin?'/api/admin/manual-upi':'/api/checkout/manual-upi';
 const load=useCallback(async()=>{
  const sequence=++requestSequence.current;
  const response=await fetch(`${endpoint}?page=${page}${admin?'&queue='+queue:''}${orderId?'&order='+encodeURIComponent(orderId):''}`,{cache:'no-store'});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load payments.');if(sequence===requestSequence.current)setData(result);return result as ManualPayments;
 },[endpoint,page,orderId,admin,queue]);
 useEffect(()=>{
  let active=true;
  const refresh=()=>{if(active)void load().then(()=>{if(active)setError('');}).catch(e=>{if(active)setError(e.message);});};
  refresh();const timer=window.setInterval(refresh,15000);return()=>{active=false;requestSequence.current++;window.clearInterval(timer);};
 },[load]);
 async function action(body:Record<string,unknown>){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to save.');
   setNotice('Saved.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Connection lost. Refresh the status before trying again.');}
  finally{setBusy(false);}
 }
 return <section className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
  <header><p className="eyebrow">ARS / Secure payments</p><h1 className="mt-3 text-3xl">{admin?'UPI Payment Verification':'Your payment'}</h1><p className="mt-3 text-sm leading-6 text-zinc-400">{admin?'Confirm receipt in your bank or UPI account before approving. A submitted UTR is not proof of payment.':'Your digital entry pass is issued only after ARS verifies receipt of your payment.'}</p></header>
  {admin&&<nav aria-label="Payment status filters" className="grid grid-cols-2 gap-2 rounded-sm border border-[#cbb88a]/30 bg-[#cbb88a]/5 p-2 sm:grid-cols-4">{queueTabs.map(tab=><button key={tab.id} type="button" disabled={busy} aria-pressed={queue===tab.id} onClick={()=>{requestSequence.current++;setQueue(tab.id);setPage(0);setData(null);setNotice('');}} className={`min-h-12 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbb88a] disabled:opacity-50 ${queue===tab.id?'bg-[#e2d4ae] text-black':'text-[#e2d4ae] hover:bg-white/10'}`}>{tab.label}{data?.counts&&<span className="ml-2 tabular-nums">({data.counts[tab.id]})</span>}</button>)}</nav>}
  <div className="flex flex-wrap gap-4 text-sm text-[#cbb88a]"><button type="button" disabled={busy} onClick={()=>void load().then(()=>setError('')).catch(e=>setError(e.message))}>Refresh status</button><Link href={admin?'/admin/tickets':'/account/tickets'}>{admin?'Tickets & Orders':'My Pass'}</Link>{orderId&&<Link href="/account/payments">All my payments</Link>}</div>
  {error&&<p role="alert" className="border border-red-400/30 p-4 text-sm text-red-300">{error}</p>}{notice&&<p role="status" className="text-sm text-[#e2d4ae]">{notice}</p>}
  {admin&&data&&<form onSubmit={e=>{e.preventDefault();void action({holdMinutes:Number(minutes)});}} className="ars-card space-y-3 p-5"><label className="ars-label" htmlFor="hold-minutes">Verification hold (minutes)</label><p className="text-sm text-zinc-400">Current: {data.holdMinutes} minutes. Changes apply to new UTR submissions only; existing deadlines remain unchanged.</p><div className="flex flex-wrap gap-3"><input id="hold-minutes" type="number" min={5} max={1440} required className="ars-input !w-36" value={minutes} onChange={e=>setMinutes(e.target.value)}/><button disabled={busy} className="ars-button">Save hold duration</button></div></form>}
  {!data&&!error&&<p role="status">Loading payment status...</p>}
  {admin&&<p className="text-xs leading-6 text-zinc-400">{queue==='pending'?'Submitted payments awaiting review, oldest first. Verify the exact amount and UTR before approving.':'Read-only payment history. No approval or rejection actions are available here.'} Orders without a submitted UTR are not included.</p>}
  {data&&!data.rows.length&&<p className="ars-card p-8 text-zinc-400">{admin?`No ${queueTabs.find(tab=>tab.id===queue)?.label.toLowerCase()} submissions on this page.`:'No payments found for this view.'}</p>}
  {data?.rows.map(payment=><PaymentCard key={payment.id} payment={payment} admin={admin} holdMinutes={data.holdMinutes} busy={busy} onAction={action}/>)}
  {!orderId&&<div className="flex gap-5 text-sm"><button disabled={page===0||busy} className="disabled:opacity-30" onClick={()=>setPage(page-1)}>Previous</button><span>Page {page+1}</span><button disabled={!data||(admin?!data.hasMore:data.rows.length<50)||busy} className="disabled:opacity-30" onClick={()=>setPage(page+1)}>Next</button></div>}
 </section>;
}

function PaymentCard({payment:p,admin,holdMinutes,busy,onAction}:{payment:ManualPayment;admin:boolean;holdMinutes:number;busy:boolean;onAction:(body:Record<string,unknown>)=>Promise<void>}){
 const [utr,setUtr]=useState('');const [note,setNote]=useState('');const [confirmed,setConfirmed]=useState(false);
 return <article className="ars-card space-y-5 border-[#cbb88a]/25 p-5 sm:p-8">
  <div className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">{paymentLabel(p.state)}</p><h2 className="mt-3 text-xl">{p.event_name}</h2><p className="mt-2 text-sm text-zinc-400">{p.quantity} guests / {p.ticket_type}</p></div><p className="text-2xl text-[#e2d4ae]">{paymentMoney(p.total)}</p></div>
  <p className="break-all text-xs text-zinc-500">Order: {p.id}</p>
  {admin&&<p className="break-words text-sm text-zinc-300">{p.customer_name} / {p.customer_email}</p>}
  {admin&&<dl className="grid gap-4 border-y border-white/10 py-4 text-sm sm:grid-cols-2"><div><dt className="ars-label">Venue</dt><dd className="text-zinc-300">{p.venue_name}</dd></div><div><dt className="ars-label">Submitted</dt><dd className="text-zinc-300">{p.submitted_at?`${paymentTime(p.submitted_at)} IST`:'Not recorded'}</dd></div></dl>}
  {p.utr&&<p className="break-all text-sm">UTR / Transaction ID: <strong>{p.utr}</strong></p>}
  {p.state==='AWAITING_UTR'&&!admin&&<>
   <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center"><Image src={UPI_QR} alt="ARS UPI payment QR" width={220} height={220} className="h-auto w-full max-w-[220px] bg-white p-3"/><div className="space-y-3 text-sm"><p className="text-zinc-400">Pay exactly <strong className="text-[#e2d4ae]">{paymentMoney(p.total)}</strong></p><p className="break-all">UPI ID: <strong>{UPI_ID}</strong></p><p>Payee: {UPI_PAYEE}</p><p className="text-zinc-400">The QR does not prefill the amount. Enter the exact payable amount in your UPI app.</p><UpiAppPicker href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}/></div></div>
   <p className="text-sm text-zinc-400">Submit your reference before {paymentTime(p.expires_at)} IST. Submission reserves your tickets for {holdMinutes} minutes while ARS reviews payment. Do not pay again if confirmation is delayed.</p>
   <form className="space-y-3" onSubmit={e=>{e.preventDefault();void onAction({orderId:p.id,utr});}}><label htmlFor={'utr-'+p.id} className="ars-label">UTR / Transaction ID</label><input id={'utr-'+p.id} required minLength={6} maxLength={64} pattern="[A-Za-z0-9]{6,64}" autoComplete="off" spellCheck={false} className="ars-input" placeholder="Enter your payment reference" value={utr} onChange={e=>setUtr(e.target.value.trim())}/><button disabled={busy} className="ars-button">{busy?'Submitting...':'Submit payment for verification'}</button></form>
  </>}
  {p.state==='PENDING'&&<p className="text-sm text-zinc-400">Inventory reserved until {paymentTime(p.expires_at)} IST. No entry pass has been issued.</p>}
  {admin&&p.state==='PENDING'&&<div className="space-y-3 border-t border-white/10 pt-5"><label htmlFor={'note-'+p.id} className="ars-label">Review note (optional for approval)</label><textarea id={'note-'+p.id} className="ars-textarea" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional approval note; a reason is required to reject"/><label className="flex items-start gap-3 text-sm text-zinc-300"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>I verified the exact amount and UTR in the receiving account.</label><div className="flex flex-wrap gap-3"><button className="ars-button" disabled={busy||!confirmed} onClick={()=>void onAction({orderId:p.id,approve:true,note})}>Verify payment & issue pass</button><button className="ars-button ars-button-secondary" disabled={busy||note.trim().length<3} onClick={()=>{if(window.confirm('Reject this payment and release the reserved inventory? This does not refund money.'))void onAction({orderId:p.id,approve:false,note});}}>Reject payment</button></div></div>}
  {p.state==='VERIFIED'&&p.ticket_id&&<Link href={`/ticket/${p.ticket_id}`} className="ars-button inline-flex">Open digital pass</Link>}
  {admin&&(p.state==='VERIFIED'||p.state==='REFUNDED')&&<section className="space-y-3 border border-[#cbb88a]/20 bg-[#cbb88a]/5 p-4 text-sm"><h3 className="ars-label">Approval details</h3><p>Approved by: {p.reviewer_name}</p><p>Approved at: {p.reviewed_at?`${paymentTime(p.reviewed_at)} IST`:'Not recorded'}</p><p className="text-[#e2d4ae]">{p.pass_status}</p><p className="text-xs text-zinc-400">Counts represent guest entries, including entries on a group pass. Entry eligibility remains subject to the existing scanner rules.</p></section>}
  {admin&&p.state==='REJECTED'&&<p className="text-sm text-zinc-400">Rejected by {p.reviewer_name}{p.reviewed_at?` on ${paymentTime(p.reviewed_at)} IST`:''}.</p>}
  {admin&&p.state==='EXPIRED'&&<p className="text-sm text-zinc-400">Hold expired: {paymentTime(p.expires_at)} IST.</p>}
  {(p.state==='EXPIRED'||p.state==='REJECTED')&&<p className="text-sm text-amber-200">Inventory has been released. No pass will be issued. If money was sent, {admin?'reconcile it with the customer before arranging any refund or new booking.':'contact ARS with your order ID and UTR. Do not pay again.'} Expiry or rejection does not automatically refund a payment.</p>}
  {p.review_note&&<p className="text-sm text-zinc-400">Review: {p.review_note}</p>}
 </article>;
}
