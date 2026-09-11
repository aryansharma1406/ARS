import { requirePage, requireRole } from '@/lib/auth';
import { getCustomerTickets } from '@/lib/store';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, LogOut, Ticket, UserRound, QrCode, Search, ShieldCheck } from 'lucide-react';

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

export default async function MyTickets({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const customer = await requirePage(() => requireRole('customer'), '/login', '/account/tickets');
  const tickets = await getCustomerTickets(customer);
  const name = displayName(customer.name, customer.email);
  const validTickets = tickets.filter(ticket => ticket.status === 'VALID').length;
  const usedTickets = tickets.filter(ticket => ticket.status === 'USED').length;
  const query = await searchParams;
  const status = ['VALID', 'USED', 'OTHER'].includes(query.status || '') ? query.status! : 'ALL';
  const search = (query.q || '').trim().slice(0, 150);
  const visibleTickets = tickets.filter(ticket => {
    const matchesStatus = status === 'ALL' || (status === 'OTHER' ? !['VALID','USED'].includes(ticket.status) : ticket.status === status);
    return matchesStatus && [ticket.event_name, ticket.venue_name, ticket.customer_name, ticket.id, ticket.order_id, ticket.ticket_type].some(value => value?.toLowerCase().includes(search.toLowerCase()));
  });
  const readyPass = tickets.find(ticket => ticket.status === 'VALID');
  const bookingCount = new Set(tickets.map(ticket => ticket.order_id)).size;

  return <main className="ars-page-shell max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
    <section className="relative grid gap-8 overflow-hidden border border-[#cbb88a]/20 bg-[radial-gradient(ellipse_at_top_left,rgba(203,184,138,.12),transparent_65%)] p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center">
      <div>
        <p className="eyebrow mb-5">ARS / Your access</p>
        <p className="mb-3 text-sm text-zinc-400">Welcome back, <span className="font-medium text-[#e2d4ae]">{name.split(/\s+/)[0]}</span></p>
        <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase leading-[.95] tracking-[-.055em]">Your nights.<br/><span className="text-[#e2d4ae]">All in one place.</span></h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400">Your personal pass collection. Find a booking, open your QR code, and keep track of every check-in.</p>
        <div className="mt-6 flex flex-wrap gap-3">{readyPass && <Link href={`/ticket/${readyPass.id}`} className="ars-button !px-4 !text-xs"><QrCode size={17}/>Open a ready pass</Link>}<Link href="/events" className="ars-button ars-button-secondary !px-4 !text-xs">Explore events <ArrowRight size={16}/></Link></div>
      </div>
      <aside className="flex min-w-[min(100%,22rem)] items-center gap-4 border border-[#cbb88a]/30 bg-[#11110f] p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#cbb88a]/60 bg-[#cbb88a]/10 text-sm font-bold text-[#e2d4ae]">{initials(name)}</div>
        <div className="min-w-0"><p className="text-sm font-bold text-white">{name}</p><p className="mt-1 truncate text-sm text-zinc-500">{customer.email}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300"><BadgeCheck size={13}/>Verified customer</p></div>
      </aside>
    </section>

    <section className="mt-5 grid grid-cols-2 gap-px border border-white/10 bg-white/10 lg:grid-cols-4">
      {[
        ['Total passes', tickets.length, 'Your digital pass collection'],
        ['Bookings', bookingCount, 'Orders containing your passes'],
        ['Not checked in', validTickets, 'Valid status; event rules still apply'],
        ['Checked in', usedTickets, 'Passes already used for entry'],
      ].map(([label, value, copy]) => <div key={String(label)} className="bg-[#080808] px-5 py-6 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-zinc-500">{label}</p><p className="mt-3 text-4xl font-black tracking-[-.06em] text-white">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p></div>)}
    </section>

    <section id="my-passes" className="scroll-mt-28 pt-10 sm:pt-14">
      <div className="mb-6 flex items-end justify-between gap-5"><div><p className="eyebrow mb-3">Your collection</p><h2 className="text-3xl font-black uppercase tracking-[-.055em] sm:text-4xl">My passes</h2></div>{tickets.length > 0 && <Link href="/events" className="editorial-link">Find another night <ArrowRight size={15}/></Link>}</div>
      {tickets.length > 0 && <form action="/account/tickets#my-passes" className="mb-5 grid gap-3 border border-white/10 bg-white/[.02] p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><label className="relative"><span className="sr-only">Search passes</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"/><input name="q" defaultValue={search} maxLength={150} placeholder="Search guest, event or booking ID" className="ars-input !pl-10"/></label><label><span className="sr-only">Pass status</span><select name="status" defaultValue={status} className="ars-select w-full"><option value="ALL">All passes ({tickets.length})</option><option value="VALID">Not checked in ({validTickets})</option><option value="USED">Checked in ({usedTickets})</option><option value="OTHER">Other statuses</option></select></label><button className="ars-button ars-button-secondary !px-5">Find passes</button></form>}
      {tickets.length ? <><p className="mb-4 text-xs text-zinc-500">Showing {visibleTickets.length} of {tickets.length} passes{(search || status !== 'ALL') && <> / <Link href="/account/tickets#my-passes" className="text-[#cbb88a] underline underline-offset-4">Clear filters</Link></>}</p><div className="grid gap-3">{visibleTickets.map(ticket => <Link key={ticket.id} href={`/ticket/${ticket.id}`} className="group grid gap-5 border border-white/10 bg-[#0d0d0c] p-5 transition hover:border-[#cbb88a]/60 hover:bg-[#11110f] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6"><div className="flex h-12 w-12 items-center justify-center border border-[#cbb88a]/30 bg-[#cbb88a]/10 text-[#e2d4ae]"><Ticket size={21}/></div><div className="min-w-0"><p className="truncate text-xl font-bold text-white">{ticket.event_name || 'ARS event pass'}</p><p className="mt-2 text-sm text-zinc-400">{ticket.customer_name} / {ticket.ticket_type}</p><p className="mt-2 text-xs text-zinc-500">Issued {formatDate(ticket.created_at)} / Pass {ticket.id.slice(0,8).toUpperCase()}</p>{ticket.scanned_at && <p className="mt-2 text-xs text-amber-200">Checked in {new Date(ticket.scanned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</p>}</div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className={`ars-chip ${ticket.status === 'VALID' ? 'border-emerald-400/30 text-emerald-300' : ticket.status === 'USED' ? 'border-amber-300/30 text-amber-200' : 'border-red-400/30 text-red-300'}`}>{ticket.status === 'VALID' ? 'Not checked in' : ticket.status === 'USED' ? 'Checked in' : ticket.status.replaceAll('_',' ')}</span><span className="flex items-center gap-2 text-xs text-[#e2d4ae]">{ticket.status === 'VALID' ? 'Open QR' : 'View pass'}<ArrowRight size={16}/></span></div></Link>)}</div>{!visibleTickets.length && <p className="border border-white/10 p-10 text-center text-sm text-zinc-400">No passes match your search. Try another name or clear the filters.</p>}</> : <div className="border border-[#cbb88a]/25 bg-[radial-gradient(circle_at_50%_0%,rgba(203,184,138,.13),transparent_22rem),#0d0d0c] px-6 py-14 text-center sm:px-12 sm:py-20"><CalendarDays size={28} className="mx-auto text-[#cbb88a]"/><p className="eyebrow mt-6">Your next experience</p><h3 className="mt-4 text-3xl font-black uppercase tracking-[-.05em] sm:text-4xl">Your next night starts here.</h3><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">When you complete a verified booking, your digital pass will appear here.</p><Link href="/events" className="ars-button mt-8">Explore events <ArrowRight size={16}/></Link></div>}
    </section>

    <section className="mt-10 border border-[#cbb88a]/20 bg-[#11110f] p-6 sm:p-8"><h2 className="flex items-center gap-3 text-lg font-semibold"><ShieldCheck size={20} className="text-[#cbb88a]"/>Before you arrive</h2><div className="mt-5 grid gap-6 text-sm leading-6 text-zinc-400 sm:grid-cols-3"><div><p className="mb-1 font-medium text-white">01 / Have your QR ready</p>Open the correct guest&apos;s pass and increase your screen brightness at the entrance.</div><div><p className="mb-1 font-medium text-white">02 / Carry a valid ID</p>Every guest must meet the event&apos;s age requirement and present a government-issued ID.</div><div><p className="mb-1 font-medium text-white">03 / Keep your pass private</p>Each QR admits one guest once. Do not post or share your QR publicly.</div></div></section>

    <section className="mt-12 flex flex-col justify-between gap-5 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-zinc-500"><UserRound size={16} className="text-[#cbb88a]"/>Signed in as <span className="text-zinc-300">{customer.email}</span></p><form action="/api/auth/logout" method="post"><button className="inline-flex min-h-10 items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-zinc-400 transition hover:text-white"><LogOut size={15}/>Sign out</button></form></section>
  </main>;
}
