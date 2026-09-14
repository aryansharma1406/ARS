'use client';

import {useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import type {Ticket} from '@/lib/types';
import {eventPhase} from '@/lib/event-schedule';
import {formatDate,formatTime} from '@/lib/utils';

type PassEvent={name:string;date:string;start_time:string;end_time:string;venue:string};
export default function GroupPassViewer({tickets,event}:{tickets:Ticket[];event?:PassEvent}){
  const router=useRouter();
  const [index,setIndex]=useState(()=>Math.max(0,tickets.findIndex(t=>t.status==='VALID')));
  const touch=useRef<{x:number;y:number}|null>(null);
  const current=Math.min(index,tickets.length-1);
  const ticket=tickets[current];
  const ended=event&&eventPhase(event,Date.now())==='past';
  const usable=ticket.status==='VALID'&&!ended;
  const move=(delta:number)=>setIndex(Math.max(0,Math.min(tickets.length-1,current+delta)));
  return <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
    <header className="mb-5 flex items-center justify-between gap-4"><Link href="/account/tickets" className="text-xs text-[#e2d4ae] underline underline-offset-4">Back to My Pass</Link><button type="button" onClick={()=>router.refresh()} className="text-xs text-zinc-400 underline">Refresh entry status</button></header>
    <p className="eyebrow">ARS / Group access</p><h1 className="mt-3 text-2xl font-bold">{event?.name||ticket.event_name||'Your event passes'}</h1>
    <p className="mt-2 text-xs text-zinc-400">{event?.venue||ticket.venue_name}{event?` / ${formatDate(event.date)} / ${formatTime(event.start_time)} IST`:''}</p>
    <p className="my-4 text-xs leading-6 text-zinc-400">Show one QR, then swipe or tap Next for the next guest. Each pass admits one person. Moving to the next pass does not mark it as scanned.</p>
    <section tabIndex={0} aria-label="Guest pass viewer" className="rounded-xl border border-[#cbb88a]/40 bg-[radial-gradient(ellipse_at_top_right,rgba(203,184,138,.14),transparent_65%)] p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#cbb88a]"
      onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}
      onTouchStart={e=>{const t=e.touches[0];touch.current={x:t.clientX,y:t.clientY};}}
      onTouchEnd={e=>{const t=e.changedTouches[0],start=touch.current;touch.current=null;if(!start)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);}}>
      <div className="flex items-center justify-between gap-3 text-xs"><p aria-live="polite" className="font-semibold text-[#e2d4ae]">Pass {current+1} of {tickets.length}</p><span className={usable?'text-emerald-300':'text-amber-200'}>{ticket.status==='USED'?'Checked in':ended&&ticket.status==='VALID'?'Event ended':ticket.status.replaceAll('_',' ')}</span></div>
      <h2 className="mt-4 break-words text-xl font-semibold">{ticket.customer_name}</h2><p className="mt-1 text-sm text-[#e2d4ae]">{ticket.ticket_type}</p>
      <div className="my-6 flex justify-center">{usable?<div className="rounded-xl bg-white p-5"><QRCodeSVG value={ticket.qr_token} size={220} level="H" includeMargin={false} className="h-auto max-w-full"/></div>:<div className="flex min-h-56 items-center justify-center px-4 text-center text-sm text-zinc-400">{ticket.status==='USED'?'This guest has already checked in.':'This pass is not available for entry.'}</div>}</div>
      {ticket.scanned_at&&<p className="mb-3 text-xs text-amber-200">Checked in: {new Date(ticket.scanned_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p>}
      <p className="break-all text-[10px] text-zinc-500">Pass ID: {ticket.id}</p><Link href={`/ticket/${ticket.id}`} className="mt-3 inline-block text-xs text-[#e2d4ae] underline">Open full pass details</Link>
    </section>
    <nav aria-label="Browse guest passes" className="sticky bottom-0 mt-4 grid grid-cols-2 gap-3 bg-[#080808]/95 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button type="button" disabled={current===0} onClick={()=>move(-1)} className="ars-button ars-button-secondary disabled:opacity-30">Previous</button><button type="button" disabled={current===tickets.length-1} onClick={()=>move(1)} className="ars-button disabled:opacity-30">Next guest</button>
    </nav>
    <label className="mt-3 block text-xs text-zinc-400">Jump to guest<select className="ars-select mt-2 w-full" value={current} onChange={e=>setIndex(Number(e.target.value))}>{tickets.map((t,i)=><option key={t.id} value={i}>{i+1}. {t.customer_name} / {t.status.replaceAll('_',' ')}</option>)}</select></label>
    <p className="mt-5 text-xs leading-6 text-zinc-500">Keep these codes private. Entry status is checked by the scanner; refresh this view to see the latest check-ins.</p>
  </main>;
}
