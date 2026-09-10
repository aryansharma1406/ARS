import { requirePage,requireRole } from '@/lib/auth';
import { getCustomerTickets } from '@/lib/store';
import Link from 'next/link';
import { EmptyState } from '@/components/PageState';

export default async function MyTickets() {
  await requirePage(()=>requireRole('customer'),'/login','/account/tickets');
  const tickets=await getCustomerTickets();
  return (
    <main className="ars-page-shell max-w-5xl px-5 py-16">
      <p className="eyebrow mb-4">ARS / Your access</p><h1 className="text-5xl font-black uppercase sm:text-7xl">My passes</h1>
      <p className="mt-2 text-zinc-500">Verified digital passes for upcoming and completed events.</p>

      <div className="mt-6 space-y-3">
        {tickets.length ? (
          tickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/ticket/${ticket.id}`}
              className="ars-card flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-6 transition hover:border-[#cbb88a]/50"
            >
              <div><p className="text-xl font-bold">{ticket.event_name || 'Event pass'}</p><p className="mt-2 text-sm text-zinc-400">{ticket.customer_name} · {ticket.ticket_type}</p></div>
              <span className={`ars-chip ${ticket.status === 'VALID' ? 'text-emerald-300' : ticket.status === 'USED' ? 'text-amber-300' : 'text-red-300'}`}>{ticket.status}</span>
            </Link>
          ))
        ) : (
          <div><EmptyState title="Your next night starts here" copy="Your digital passes will appear after verified payment."/><Link href="/events" className="ars-button mt-6">Explore events</Link></div>
        )}
      </div>

      <form action="/api/auth/logout" method="post">
        <button className="ars-button mt-6">Sign out</button>
      </form>
    </main>
  );
}
