'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { eventPhase, eventWindow } from '@/lib/event-schedule';
import { formatDate, formatTime } from '@/lib/utils';
import type { Event, Ticket as StoredTicket } from '@/lib/types';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, CalendarDays, Clock, LogOut, MapPin, QrCode, ShieldCheck, Users } from 'lucide-react';

type Ticket = Omit<StoredTicket, 'qr_token'>;
type Collection = { id: string; event?: Event; passes: Ticket[] };
type Props = {
  customer: { name: string; email: string; userId: string };
  tickets: Ticket[];
  eventList: Event[];
  params: { status?: string; q?: string };
  eventDetailsUnavailable: boolean;
  now: number;
};
export default function MemberPassCollection({ customer, tickets, eventList, params, eventDetailsUnavailable, now }: Props) {
  const events = new Map(eventList.map(event => [event.id, event]));
  const name = customer.name?.trim() && customer.name.toLowerCase() !== 'account' ? customer.name : customer.email.split('@')[0];
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const bucket = (ticket: Ticket) => {
    if (ticket.status === 'USED') return 'used';
    const event = events.get(ticket.event_id);
    return ticket.status === 'VALID' && (!event || eventPhase(event, now) !== 'past') ? 'upcoming' : 'past';
  };
  const status = params.status === 'USED' ? 'used' : params.status === 'OTHER' ? 'past' : ['upcoming', 'used', 'past'].includes(params.status || '') ? params.status! : 'upcoming';
  const [search, setSearch] = useState((params.q || '').slice(0, 150));
  const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean);
  function highlight(value: string) {
    if (!terms.length) return value;
    const characters = Array.from(value);
    let normalized = '';
    const positions: number[] = [];
    characters.forEach((character, index) => {
      const part = normalize(character);
      normalized += part;
      for (let i = 0; i < part.length; i++) positions.push(index);
    });
    const matched = new Set<number>();
    for (const term of terms) {
      let start = normalized.indexOf(term);
      while (start !== -1) {
        for (let i = start; i < start + term.length; i++) matched.add(positions[i]);
        start = normalized.indexOf(term, start + 1);
      }
    }
    const segments: { text: string; matched: boolean }[] = [];
    characters.forEach((character, index) => {
      const isMatch = matched.has(index);
      const previous = segments[segments.length - 1];
      if (previous && previous.matched === isMatch) previous.text += character;
      else segments.push({ text: character, matched: isMatch });
    });
    return segments.map((segment, index) => segment.matched
      ? <mark key={index} className="rounded-sm bg-[#cbb88a]/25 text-[#ffe6a3] ring-1 ring-inset ring-[#cbb88a]/20">{segment.text}</mark>
      : segment.text);
  }

  function collections(list: Ticket[]): Collection[] {
    const groups = new Map<string, Collection>();
    for (const ticket of list) {
      if (!groups.has(ticket.event_id)) groups.set(ticket.event_id, { id: ticket.event_id, event: events.get(ticket.event_id), passes: [] });
      groups.get(ticket.event_id)!.passes.push(ticket);
    }
    return [...groups.values()].sort((a, b) => (a.event ? eventWindow(a.event).start : Infinity) - (b.event ? eventWindow(b.event).start : Infinity));
  }
  const upcoming = collections(tickets.filter(ticket => bucket(ticket) === 'upcoming'));
  const hero = upcoming.find(group => group.event) || upcoming[0];
  const visible = collections(tickets.filter(ticket => bucket(ticket) === status && terms.every(term => normalize([events.get(ticket.event_id)?.name, events.get(ticket.event_id)?.venue_name, ticket.event_name, ticket.venue_name, ticket.customer_name, ticket.id, ticket.order_id, ticket.ticket_type].filter(Boolean).join(' ')).includes(term))));
  const eventTitle = (group: Collection) => group.event?.name || group.passes[0].event_name || 'Your ARS experience';
  const schedule = (event?: Event) => event ? `${formatDate(`${event.date.slice(0, 10)}T12:00:00`)} / ${formatTime(event.start_time)} IST` : 'Open your pass for event details';

  return <main className="ars-page-shell max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div><p className="eyebrow mb-3">ARS / The membership experience</p><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Your nights, reserved.</h1><p className="mt-3 text-sm text-zinc-400">Welcome back, {name.split(/\s+/)[0]}. Your next experience awaits.</p></div>
      <Link href="/events" className="editorial-link">Discover the line-up <ArrowUpRight size={16}/></Link>
    </header>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="relative isolate flex min-h-[480px] flex-col justify-end overflow-hidden border border-[#cbb88a]/25 bg-[#14130f] p-6 sm:min-h-[550px] sm:p-10">
        {hero?.event?.image && <div className="absolute inset-0 -z-20"><CatalogImage src={hero.event.image} alt={eventTitle(hero)} className="object-cover" sizes="(max-width:1024px) 100vw, 70vw"/></div>}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55)_35%,#080808_100%)]"/>
        <div className="absolute left-6 top-6 flex items-center gap-2 border border-[#cbb88a]/40 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[.2em] text-[#e2d4ae] sm:left-10 sm:top-8"><span className="h-1.5 w-1.5 rounded-full bg-[#e2d4ae]"/>{hero ? 'Your next night' : 'An invitation to something extraordinary'}</div>
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-[#e2d4ae]"><MapPin size={14}/>{highlight(hero?.event?.venue_name || hero?.passes[0].venue_name || 'ARS Hospitality')}</p>
        <h2 className="max-w-2xl break-words text-4xl font-black uppercase leading-[.95] tracking-tight sm:text-6xl">{hero ? highlight(eventTitle(hero)) : 'Make a night of it.'}</h2>
        <p className="mt-5 flex items-center gap-2 text-sm text-zinc-300"><CalendarDays size={16}/>{hero ? schedule(hero.event) : 'Exceptional venues. Unforgettable nights.'}</p>
        {hero && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#e2d4ae]"><span>{[...new Set(hero.passes.map(pass => pass.ticket_type))].join(' / ')}</span><span className="flex items-center gap-2"><Users size={16}/>{hero.passes.reduce((n,p)=>n+(p.purchased_quantity||1),0)} guests / {hero.passes.length} booking pass{hero.passes.length===1?'':'es'}</span></div>}
        <div className="mt-8 flex flex-wrap items-center gap-5"><Link href={hero ? `/ticket/${hero.passes[0].id}` : '/events'} className="ars-button !bg-[#e2d4ae] !text-black"><QrCode size={18}/>{hero ? 'Open digital pass' : 'Explore events'}</Link>{hero && hero.passes.length > 1 && <Link href={`/account/tickets/event/${hero.id}`} className="ars-button ars-button-secondary">Open all passes ({hero.passes.length})</Link>}</div>
      </section>

      <aside className="flex flex-col justify-between gap-8 border border-[#cbb88a]/30 bg-[radial-gradient(ellipse_at_top_right,rgba(203,184,138,.16),transparent_70%)] p-6 sm:p-7">
        <div><p className="text-xs font-bold tracking-[.3em] text-[#e2d4ae]">ARS / MEMBERSHIP</p><div className="mb-5 mt-9 flex h-16 w-16 items-center justify-center rounded-full border border-[#cbb88a]/50 text-xl text-[#e2d4ae]">{initials}</div><h2 className="break-words text-xl font-semibold">{name}</h2><p className="mt-2 break-all text-xs text-zinc-400">{customer.email}</p><p className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#e2d4ae]"><BadgeCheck size={16}/>Verified ARS Member</p></div>
        <div className="space-y-5 border-t border-[#cbb88a]/20 pt-6"><div className="flex items-baseline justify-between"><span className="text-sm text-zinc-400">Nights ahead</span><strong className="text-3xl font-medium text-[#e2d4ae]">{upcoming.length}</strong></div><div className="flex items-baseline justify-between"><span className="text-sm text-zinc-400">Guest passes ready</span><strong className="text-3xl font-medium text-[#e2d4ae]">{tickets.filter(ticket => bucket(ticket) === 'upcoming').length}</strong></div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Personal access / {customer.userId.slice(0, 8).toUpperCase()}</p></div>
      </aside>
    </div>

    <section id="my-passes" className="scroll-mt-28 pt-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5"><h2 className="text-2xl font-semibold tracking-tight">Your collection</h2><nav aria-label="Pass collections" className="flex gap-5 border-b border-white/10">{['upcoming', 'used', 'past'].map(tab => <Link key={tab} href={`/account/tickets?status=${tab}${search ? `&q=${encodeURIComponent(search)}` : ''}#my-passes`} aria-current={status === tab ? 'page' : undefined} className={`border-b-2 pb-3 text-sm capitalize ${status === tab ? 'border-[#cbb88a] text-[#e2d4ae]' : 'border-transparent text-zinc-500 hover:text-white'}`}>{tab}</Link>)}</nav></div>
      <div className="mb-6">
        <label htmlFor="pass-search" className="sr-only">Search by guest, event, venue, booking ID or pass ID</label>
        <div className="relative">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb88a]"/>
          <input id="pass-search" type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={150} placeholder="Search guest, event, venue or booking" autoComplete="off" aria-controls="pass-results" className="ars-input min-w-0 !pl-11 !pr-20"/>
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 min-h-10 -translate-y-1/2 px-2 text-xs text-[#e2d4ae] hover:text-white">Clear</button>}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-xs text-zinc-500">{visible.reduce((count, group) => count + group.passes.length, 0)} matching passes in {status}</p>
      </div>
      {eventDetailsUnavailable && <p className="mb-5 text-sm text-zinc-400">Some event details are temporarily unavailable. Your digital passes remain accessible below.</p>}
      <div id="pass-results" className="grid gap-6 md:grid-cols-2">{visible.map(group => <article key={group.id} className="overflow-hidden border border-[#cbb88a]/20 bg-[#0e0e0c]">
        <div className="relative flex min-h-60 items-end overflow-hidden p-6">{group.event?.image && <CatalogImage src={group.event.image} alt={eventTitle(group)} className="object-cover" sizes="(max-width:768px) 100vw, 50vw"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0c] via-black/30 to-black/20"/><div className="relative"><p className="mb-2 text-[10px] uppercase tracking-[.2em] text-[#e2d4ae]">{highlight(group.event?.venue_name || group.passes[0].venue_name || 'ARS Hospitality')}</p><h3 className="text-3xl font-bold tracking-tight">{highlight(eventTitle(group))}</h3></div></div>
        <div className="px-6 pb-6"><p className="flex items-center gap-2 text-xs text-zinc-400"><Clock size={14}/>{schedule(group.event)}</p><div className="my-5 flex flex-wrap justify-between gap-2 border-y border-white/10 py-4 text-xs text-[#e2d4ae]"><span>{highlight([...new Set(group.passes.map(pass => pass.ticket_type))].join(' / '))}</span><span>{group.passes.length} guest pass{group.passes.length === 1 ? '' : 'es'}</span></div>
          {tickets.filter(pass=>pass.event_id===group.id).length>1&&<Link href={`/account/tickets/event/${group.id}`} className="ars-button ars-button-secondary mb-5 w-full"><QrCode size={16}/>Open all event passes</Link>}
          <details open={group.passes.length === 1 || terms.length > 0}><summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-[#e2d4ae]">View booking passes ({group.passes.length})</summary><div className="mt-4 space-y-3">{group.passes.map((pass, index) => <Link key={pass.id} href={`/ticket/${pass.id}`} className="flex items-center justify-between gap-3 border border-white/10 p-3 hover:border-[#cbb88a]/60"><div className="min-w-0"><p className="text-sm">{highlight(pass.customer_name)} <span className="text-zinc-500">/ {index + 1}</span></p><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{pass.status === 'USED' ? 'Checked in' : bucket(pass) === 'past' && pass.status === 'VALID' ? 'Event ended' : pass.status.replaceAll('_', ' ')}</p>{terms.length > 0 && [pass.order_id, pass.id].some(value => terms.some(term => normalize(value).includes(term))) && <p className="mt-2 break-all text-[10px] leading-5 text-zinc-400">Booking: {highlight(pass.order_id)}<br/>Pass: {highlight(pass.id)}</p>}{pass.group_id && <p className="mt-2 text-xs text-[#e2d4ae]">GROUP PASS · {pass.checked_in_quantity} / {pass.purchased_quantity} guests entered · Remaining: {pass.remaining_quantity}</p>}{pass.scanned_at && <p className="mt-1 text-xs text-zinc-400">{new Date(pass.scanned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>}</div><span className="flex shrink-0 items-center gap-2 text-xs text-[#e2d4ae]">{bucket(pass) === 'upcoming' ? 'Open QR' : 'View pass'}<ArrowUpRight size={15}/></span></Link>)}</div></details>
        </div>
      </article>)}</div>
      {!visible.length && <div className="border border-[#cbb88a]/20 px-6 py-12 text-center"><p className="text-xl font-medium">{search.trim() ? 'No passes match your search.' : status === 'upcoming' ? 'Your next night is waiting.' : 'No passes in this collection yet.'}</p><p className="mt-3 text-sm text-zinc-400">{search.trim() ? 'Try a shorter name, venue or booking ID, or clear your search.' : 'Every night has its place. Your passes will appear here.'}</p><Link href="/events" className="editorial-link mt-5 inline-flex">Explore events <ArrowUpRight size={15}/></Link></div>}
    </section>
    <section className="mt-10 flex flex-col gap-4 border-y border-[#cbb88a]/20 py-5 sm:flex-row sm:items-center"><p className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e2d4ae]"><ShieldCheck size={18}/>The door essentials</p><p className="text-xs leading-6 text-zinc-400">QR ready. Valid government photo ID. Meet the event age requirement. Staff confirm the entering quantity for group bookings; keep your code private.</p></section>
    <footer className="mt-7 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500"><span>ARS Hospitality / After dark. Beyond ordinary.</span><form action="/api/auth/logout" method="post"><button className="flex min-h-10 items-center gap-2 hover:text-white"><LogOut size={14}/>Sign out</button></form></footer>
  </main>;
}
