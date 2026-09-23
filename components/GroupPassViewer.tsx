'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {Ticket} from '@/lib/types';
import DigitalTicketCard from './DigitalTicketCard';
type PassEvent={name:string;date:string;start_time:string;end_time:string;venue:string};
export default function GroupPassViewer({tickets,event}:{tickets:Ticket[];event?:PassEvent}){
 const router=useRouter();
 return <main className="mx-auto max-w-xl space-y-6 px-4 py-6">
  <header className="flex items-center justify-between gap-4"><Link href="/account/tickets" className="text-sm text-[#e2d4ae]">Back to My Pass</Link><button type="button" onClick={()=>router.refresh()} className="text-sm underline">Refresh entry status</button></header>
  <h1 className="text-2xl">{event?.name||'Your booking passes'}</h1>
  {tickets.map(ticket=><DigitalTicketCard key={ticket.id} ticket={ticket}/>)}
 </main>;
}
