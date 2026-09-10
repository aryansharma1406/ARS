import EventCard from '@/components/EventCard';
import { getPublicCatalog } from '@/lib/catalog';
import CatalogUnavailable from '@/components/CatalogUnavailable';
import { ArrowDown, ArrowRight, CalendarDays, MapPin, ShieldCheck, Ticket, ScanLine } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';

export default async function HomePage() {
  const { events, venues, issue } = await getPublicCatalog();
  const heroImage = events[0]?.image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=85&w=2000&auto=format&fit=crop';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const tonight = events.filter(event => event.date === today);
  const upcoming = events.filter(event => event.date > today);
  return (
    <div>
      <section className="relative isolate min-h-[min(950px,100svh)] overflow-hidden border-b border-white/10">
        <CatalogImage src={heroImage} alt="Lights over the dance floor" priority className="object-cover object-[65%_center]" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/30" />
        <div className="relative mx-auto flex min-h-[min(950px,100svh)] max-w-7xl flex-col justify-end px-5 pb-8 pt-40 sm:px-8 sm:pb-10">
          <div className="animate-fadeIn">
            <p className="eyebrow mb-7 text-[10px] sm:text-xs">Curated nightlife · Instant access</p>
            <h1 className="text-[clamp(3.3rem,10.5vw,9rem)] font-black uppercase leading-[.86] tracking-[-.075em]">Experience<br/><span className="text-[#eee8db]">the night.</span></h1>
            <p className="mt-7 max-w-md text-sm leading-7 text-zinc-300 sm:text-base">Discover the best events, venues and nights worth remembering.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/events" className="ars-button">Explore events <ArrowRight size={16}/></Link><Link href="/partner" className="ars-button ars-button-secondary">Partner with ARS</Link></div>
          </div>
          <div className="mt-16 flex items-center justify-between border-t border-white/20 pt-5 text-[10px] uppercase tracking-[.18em] text-zinc-400 sm:mt-20">
            <a href="#tonight" className="flex items-center gap-3">Discover the line-up <ArrowDown size={14}/></a>
            <span className="hidden sm:block">After dark. Beyond ordinary.</span>
            {events[0]?.venue_name && <span className="hidden lg:block">{events[0].venue_name}</span>}
          </div>
        </div>
      </section>

      <section id="tonight" className="ars-section scroll-mt-24">
        <div className="section-heading"><div><p className="eyebrow mb-4">01 / The evening edit</p><h2>Tonight&apos;s picks</h2></div><Link href="/events" className="editorial-link">All events <ArrowRight size={16}/></Link></div>
        {issue ? <CatalogUnavailable issue={issue}/> : tonight.length ? <div className="space-y-6"><EventCard event={tonight[0]} featured/>{tonight.length > 1 && <div className="mobile-event-rail grid gap-6 md:grid-cols-2">{tonight.slice(1,3).map(event => <EventCard key={event.id} event={event}/>)}</div>}</div> : <div className="grid gap-6 border-l-2 border-[#cbb88a]/50 bg-[#10100f] p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-12"><div><CalendarDays size={24} className="mb-6 text-[#cbb88a]"/><h3 className="text-2xl font-black uppercase">No events tonight</h3><p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">There are currently no published events for tonight. Your next night out could be just ahead.</p></div><Link href="/events" className="editorial-link w-fit">Explore the calendar <ArrowRight size={16}/></Link></div>}
      </section>

      <section id="venues" className="scroll-mt-20 border-y border-white/10 bg-[#0d0d0c]">
        <div className="ars-section">
          <div className="section-heading"><div><p className="eyebrow mb-4">02 / Places with a pulse</p><h2>Featured<br/>venues</h2></div><p className="hidden max-w-xs text-sm leading-6 text-zinc-400 sm:block">Find your room. Discover the spaces behind the nights.</p></div>
          {issue ? <CatalogUnavailable issue={issue}/> : venues.length ? <div className="grid gap-8 md:grid-cols-2">{venues.map((venue,index) => <Link key={venue.id} href={`/events?venue=${encodeURIComponent(venue.name)}`} className={`group ${index % 2 ? 'md:mt-20' : ''}`}><div className="relative aspect-[5/4] overflow-hidden"><CatalogImage src={venue.image} alt={venue.name} className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width:768px) 100vw,50vw"/><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/><span className="absolute left-6 top-6 text-xs tracking-[.2em]">{String(index+1).padStart(2,'0')} / ARS</span></div><div className="flex items-end justify-between gap-4 border-b border-white/15 py-6"><div><p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-zinc-400"><MapPin size={12}/>{venue.location}</p><h3 className="text-3xl font-black uppercase">{venue.name}</h3></div><ArrowRight className="transition-transform group-hover:translate-x-1"/></div></Link>)}</div> : <p className="border-t border-white/10 py-10 text-zinc-400">Venue announcements will appear here when available.</p>}
        </div>
      </section>

      <section className="ars-section"><div className="section-heading"><div><p className="eyebrow mb-4">03 / Make plans after dark</p><h2>Upcoming events</h2></div><Link href="/events" className="editorial-link">View calendar <ArrowRight size={16}/></Link></div>{issue ? <CatalogUnavailable issue={issue}/> : upcoming.length ? <div className="mobile-event-rail grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcoming.slice(0,3).map(event => <EventCard key={event.id} event={event}/>)}</div> : <div className="border-b border-white/10 pb-10"><h3 className="text-xl font-bold uppercase">The next chapter is coming</h3><p className="mt-3 text-sm text-zinc-400">New nights will appear as soon as events are published.</p></div>}</section>

      <section className="border-y border-white/10"><div className="ars-section grid gap-12 lg:grid-cols-[1.1fr_1fr]"><div><p className="eyebrow mb-5">Why ARS</p><h2 className="text-5xl font-black uppercase leading-[.95] tracking-[-.06em] sm:text-7xl">A great night.<br/>A seamless<br/><span className="text-[#b6a786]">way in.</span></h2></div><div className="divide-y divide-white/15">{[[Ticket,'Your night, in one place','Explore published events, compare the details and choose your access.'],[ShieldCheck,'A considered checkout','Review your pass, quantity and fees before paying through Razorpay.'],[ScanLine,'Straight to your digital pass','Once payment is verified, your QR pass is ready in your account.']].map(([Icon,title,copy]) => { const Symbol = Icon as typeof Ticket; return <div key={String(title)} className="flex gap-5 py-7"><Symbol size={22} className="mt-1 shrink-0 text-[#cbb88a]"/><div><h3 className="text-lg font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{String(copy)}</p></div></div>; })}</div></div></section>

      <section className="ars-section"><p className="eyebrow mb-5">How it works</p><h2 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">Three steps to the night.</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{[['01','Find your night','Browse the line-up and choose an event that moves you.'],['02','Choose your access','Select your quantity, review the total and complete payment.'],['03','Meet us at the door','Bring your digital QR pass and matching photo ID.']].map(([number,title,copy]) => <div key={number} className="border-t border-white/20 pt-6"><p className="mb-8 text-xs text-[#cbb88a]">{number}</p><h3 className="text-xl font-bold uppercase">{title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-zinc-400">{copy}</p></div>)}</div></section>

      <section className="border-y border-[#cbb88a]/20 bg-[#151410]"><div className="ars-section grid items-end gap-10 md:grid-cols-[1fr_auto]"><div><p className="eyebrow mb-5">Partner with ARS</p><h2 className="text-5xl font-black uppercase leading-none tracking-[-.06em] sm:text-7xl">You set the scene.<br/>We open the doors.</h2><p className="mt-6 max-w-md text-sm leading-6 text-zinc-400">Bring your venue to ARS for event sales, guest access and operations built around the night.</p><p className="mt-3 text-xs uppercase tracking-[.12em] text-[#cbb88a]">Already an ARS venue partner? <Link href="/owner/login" className="underline underline-offset-4 hover:text-white">Owner login</Link></p></div><Link href="/partner" className="ars-button w-fit">Request partnership <ArrowRight size={16}/></Link></div></section>
    </div>
  );
}
