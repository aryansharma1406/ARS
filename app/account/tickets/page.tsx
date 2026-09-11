import { requirePage, requireRole } from '@/lib/auth';
import { getCustomerTickets } from '@/lib/store';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, LogOut, Ticket, UserRound } from 'lucide-react';

function displayName(name: string, email: string) {
  const savedName = name.trim();
  if (savedName && savedName.toLowerCase() !== 'account') return savedName;
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/(\D)(\d)/g, '$1 $2').replace(/\b\w/g, character => character.toUpperCase());
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently added' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default async function MyTickets() {
  const customer = await requirePage(() => requireRole('customer'), '/login', '/account/tickets');
  const tickets = await getCustomerTickets(customer);
  const name = displayName(customer.name, customer.email);
  const validTickets = tickets.filter(ticket => ticket.status === 'VALID').length;
  const usedTickets = tickets.filter(ticket => ticket.status === 'USED').length;

  return <main className="ars-page-shell max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
    <section className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="eyebrow mb-5">ARS / Your access</p>
        <h1 className="text-[clamp(3.2rem,7vw,6.5rem)] font-black uppercase leading-[.86] tracking-[-.07em]">Welcome back,<br/><span className="text-[#e2d4ae]">{name}.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Your ARS account keeps every verified pass ready for the door.</p>
      </div>
      <aside className="flex min-w-[min(100%,22rem)] items-center gap-4 border border-[#cbb88a]/30 bg-[#11110f] p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#cbb88a]/60 bg-[#cbb88a]/10 text-sm font-bold text-[#e2d4ae]">{initials(name)}</div>
        <div className="min-w-0"><p className="text-sm font-bold text-white">{name}</p><p className="mt-1 truncate text-sm text-zinc-500">{customer.email}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300"><BadgeCheck size={13}/>Verified customer</p></div>
      </aside>
    </section>

    <section className="grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-3">
      {[
        ['Total passes', tickets.length, 'All verified ARS access'],
        ['Ready for the door', validTickets, 'Active passes in your account'],
        ['Past experiences', usedTickets, 'Passes already checked in'],
      ].map(([label, value, copy]) => <div key={String(label)} className="bg-[#080808] px-5 py-6 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-zinc-500">{label}</p><p className="mt-3 text-4xl font-black tracking-[-.06em] text-white">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p></div>)}
    </section>

    <section className="pt-10 sm:pt-14">
      <div className="mb-6 flex items-end justify-between gap-5"><div><p className="eyebrow mb-3">Your collection</p><h2 className="text-3xl font-black uppercase tracking-[-.055em] sm:text-4xl">My passes</h2></div>{tickets.length > 0 && <Link href="/events" className="editorial-link">Find another night <ArrowRight size={15}/></Link>}</div>
      {tickets.length ? <div className="grid gap-3">{tickets.map(ticket => <Link key={ticket.id} href={`/ticket/${ticket.id}`} className="group grid gap-5 border border-white/10 bg-[#0d0d0c] p-5 transition hover:border-[#cbb88a]/60 hover:bg-[#11110f] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6"><div className="flex h-12 w-12 items-center justify-center border border-[#cbb88a]/30 bg-[#cbb88a]/10 text-[#e2d4ae]"><Ticket size={21}/></div><div className="min-w-0"><p className="truncate text-xl font-bold text-white">{ticket.event_name || 'ARS event pass'}</p><p className="mt-2 text-sm text-zinc-400">{ticket.venue_name || 'Venue details in your pass'} · {ticket.ticket_type}</p><p className="mt-2 text-xs uppercase tracking-[.12em] text-zinc-500">Issued {formatDate(ticket.created_at)}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className={`ars-chip ${ticket.status === 'VALID' ? 'border-emerald-400/30 text-emerald-300' : ticket.status === 'USED' ? 'border-amber-300/30 text-amber-200' : 'border-red-400/30 text-red-300'}`}>{ticket.status === 'VALID' ? 'Ready' : ticket.status}</span><ArrowRight size={18} className="text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-[#e2d4ae]"/></div></Link>)}</div> : <div className="border border-[#cbb88a]/25 bg-[radial-gradient(circle_at_50%_0%,rgba(203,184,138,.13),transparent_22rem),#0d0d0c] px-6 py-14 text-center sm:px-12 sm:py-20"><CalendarDays size={28} className="mx-auto text-[#cbb88a]"/><p className="eyebrow mt-6">Your next experience</p><h3 className="mt-4 text-3xl font-black uppercase tracking-[-.05em] sm:text-4xl">Your next night starts here.</h3><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">When you complete a verified booking, your digital pass will appear here instantly.</p><Link href="/events" className="ars-button mt-8">Explore events <ArrowRight size={16}/></Link></div>}
    </section>

    <section className="mt-12 flex flex-col justify-between gap-5 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-zinc-500"><UserRound size={16} className="text-[#cbb88a]"/>Signed in as <span className="text-zinc-300">{customer.email}</span></p><form action="/api/auth/logout" method="post"><button className="inline-flex min-h-10 items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-zinc-400 transition hover:text-white"><LogOut size={15}/>Sign out</button></form></section>
  </main>;
}
