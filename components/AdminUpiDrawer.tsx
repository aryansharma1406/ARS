'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {UpiDetail} from '@/lib/admin-upi-types';
import {paymentLabel,paymentMoney,paymentTime} from '@/lib/manual-upi';
const time=(value:string|null|undefined)=>value?paymentTime(value)+' IST':'Not recorded';

export default function AdminUpiDrawer({orderId,onClose,onUpdated}:{orderId:string;onClose:()=>void;onUpdated:()=>void}){
 const [detail,setDetail]=useState<UpiDetail|null>(null);const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);
 const [note,setNote]=useState('');const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);
 const drawer=useRef<HTMLDivElement>(null);const close=useRef(onClose);close.current=onClose;const working=useRef(false);working.current=busy;
 useEffect(()=>{
  const before=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';drawer.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!working.current)close.current();
   if(event.key!=='Tab')return;
   const nodes=drawer.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href]');if(!nodes?.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===drawer.current)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);before?.focus();};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();setError('');setDetail(null);setNote('');setConfirmed(false);
  void fetch('/api/admin/upi-report?id='+encodeURIComponent(orderId),{cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load payment.');if(!controller.signal.aborted)setDetail(result);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[orderId,refresh]);
 async function review(approve:boolean){
  if(busy||!detail||detail.state!=='PENDING'||(!approve&&note.trim().length<3)||(approve&&!confirmed))return;
  if(!window.confirm(approve?'Approve this verified bank receipt and issue the entry pass?':'Reject this payment and release inventory? This does not refund money.'))return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/manual-upi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,approve,note})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Review could not be saved.');onUpdated();setRefresh(value=>value+1);
  }catch(e){setError(e instanceof Error?e.message:'Connection lost. Refresh payment details before retrying.');}
  finally{setBusy(false);}
 }
 return <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><div ref={drawer} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="upi-detail-heading" className="h-full w-full max-w-2xl space-y-6 overflow-y-auto border-l border-[#cbb88a]/30 bg-[#0d0d0b] p-5 outline-none sm:p-8">
  <header className="flex items-center justify-between gap-3"><h2 id="upi-detail-heading" className="text-xl">Payment details</h2><button disabled={busy} onClick={onClose} className="min-h-11 px-3 text-sm text-[#e2d4ae]">Close</button></header>
  {error&&<p role="alert" className="border border-red-400/30 p-3 text-sm text-red-300">{error}</p>}
  <button disabled={busy} className="text-xs text-[#e2d4ae] underline" onClick={()=>setRefresh(value=>value+1)}>Refresh payment details</button>
  {!detail&&!error&&<p role="status" className="text-sm text-zinc-400">Loading details...</p>}
  {detail&&<><div className="border-b border-white/10 pb-4"><p className="eyebrow">{paymentLabel(detail.state)}</p><h3 className="mt-3 text-2xl text-[#e2d4ae]">{paymentMoney(detail.order.total)}</h3><p className="mt-2 text-sm">{detail.order.event_name} / {detail.order.venue_name}</p></div>
   <dl className="space-y-3 text-sm">{[['Order ID',detail.order.id],['Customer',detail.order.customer_name],['Email',detail.order.customer_email],['Phone',detail.order.customer_phone],['Guests',detail.order.quantity],['Pass type',detail.order.ticket_type],['Subtotal',paymentMoney(detail.order.subtotal)],['Fees',paymentMoney(detail.order.fees)],['UTR',detail.payment.utr],['Order created',time(detail.order.created_at)],['UTR submitted',time(detail.payment.submitted_at)],['Hold expiry',time(detail.order.expires_at)],['Reviewed',time(detail.payment.reviewed_at)],['Reviewer',detail.payment.reviewer_name||detail.payment.reviewed_by||'Not reviewed'],['Review note',detail.payment.review_note||'None']].map(([label,value])=><div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-white/5 pb-2"><dt className="text-zinc-500">{label}</dt><dd className="break-words text-zinc-300">{value}</dd></div>)}</dl>
   {detail.state==='PENDING'?<section className="space-y-4 border border-[#cbb88a]/30 bg-[#cbb88a]/5 p-4"><h3 className="ars-label">Review payment</h3><p className="text-xs leading-6 text-zinc-400">Check the actual bank receipt. A reference supplied by the customer is not proof of payment. Expired holds cannot be approved.</p><label className="block"><span className="ars-label">Review note (optional for approval)</span><textarea disabled={busy} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} className="ars-textarea" placeholder="Optional approval note; a reason is required to reject"/></label><label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>I verified the exact amount and UTR in the receiving account.</label><div className="flex flex-wrap gap-3"><button disabled={busy||!confirmed} onClick={()=>void review(true)} className="ars-button !text-xs">Approve & issue pass</button><button disabled={busy||note.trim().length<3} onClick={()=>void review(false)} className="ars-button ars-button-secondary !text-xs">Reject</button></div></section>:<p className="text-xs leading-6 text-zinc-400">Read-only history. {detail.state==='REJECTED'||detail.state==='EXPIRED'?'Inventory has been released. Any received money needs separate reconciliation; no automatic refund is performed.':''}</p>}
   <section><h3 className="ars-label">Tickets / guest entry status</h3><p className="mb-3 text-xs text-zinc-500">{detail.tickets.length} guest entries issued; {detail.tickets.filter(ticket=>ticket.status==='USED').length} checked in. Group bookings may share one QR.</p>{detail.tickets.length?<div className="space-y-2">{detail.tickets.map(ticket=><div key={ticket.id} className="border border-white/10 p-3 text-xs"><p>{ticket.customer_name} / {ticket.ticket_type}</p><p className="mt-1 text-[#e2d4ae]">{ticket.status}</p><p className="mt-1 break-all font-mono text-zinc-500">{ticket.id}</p>{ticket.scanned_at&&<p className="mt-1">Checked in: {time(ticket.scanned_at)}</p>}</div>)}{detail.state==='VERIFIED'&&<Link href={`/ticket/${detail.tickets[0].id}`} className="ars-button !text-xs">Open digital pass</Link>}</div>:<p className="text-sm text-zinc-400">No tickets issued.</p>}</section>
   <section><h3 className="ars-label">Payment audit history</h3>{!detail.audit.length?<p className="text-sm text-zinc-400">No audit records available.</p>:<ol className="space-y-3">{detail.audit.map(item=><li key={item.id} className="border-l border-[#cbb88a]/30 pl-4 text-xs"><p className="font-semibold text-[#e2d4ae]">{item.action}</p><p className="mt-1 text-zinc-400">{time(item.created_at)} / {item.actor_name||item.actor_id}</p><dl className="mt-2 space-y-1">{Object.entries(item.details).map(([key,value])=><div key={key} className="break-words text-zinc-500"><dt className="inline">{key}: </dt><dd className="inline">{typeof value==='object'?JSON.stringify(value):String(value??'')}</dd></div>)}</dl></li>)}</ol>}</section>
  </>}
 </div></div>;
}
