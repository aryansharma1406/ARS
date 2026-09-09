import { requirePage,requireRole } from '@/lib/auth';
import { getCustomerTickets } from '@/lib/store';
import Link from 'next/link';
export default async function MyTickets() {
  await requirePage(()=>requireRole('customer'),'/login','/account/tickets');
  const tickets=await getCustomerTickets();
  return <main className="mx-auto max-w-3xl px-4 py-12 text-white"><h1 className="text-3xl font-black uppercase">My passes</h1><div className="mt-6 space-y-3">{tickets.length?tickets.map(ticket=><Link className="block border border-white/15 p-4" href={`/ticket/${ticket.id}`} key={ticket.id}>{ticket.customer_name} · {ticket.ticket_type} · {ticket.status}</Link>):<p className="text-zinc-400">Your passes will appear after verified payment.</p>}</div><form action="/api/auth/logout" method="post"><button className="ars-button mt-6">Sign out</button></form></main>;
}
