import EventCard from '@/components/EventCard';
import { getPublicCatalog } from '@/lib/catalog';
import CatalogUnavailable from '@/components/CatalogUnavailable';
import { ArrowRight,CalendarDays,MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function HomePage() {
  const {events, venues, issue} = await getPublicCatalog();
  const heroImage = events[0]?.image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=85&w=2000&auto=format&fit=crop';

  return (
    <div className="pb-10">
      <section className="relative min-h-[calc(100svh-72px)] overflow-hidden border-b border-white/10">
        <Image src={heroImage} alt="A packed nightlife event" fill priority className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/25" />
        <div className="relative mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl items-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-4xl">
            <p className="eyebrow mb-5">Curated nightlife · Instant access</p>
            <h1 className="max-w-4xl text-[clamp(3.7rem,10vw,8.8rem)] font-black uppercase leading-[.82] tracking-[-.075em] text-white">Experience<br />the night.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">Discover the best events, venues and nights worth remembering.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/events" className="ars-button">Explore events <ArrowRight size={16} /></Link>
              <Link href="/owner/login" className="ars-button ars-button-secondary">Partner with ARS</Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 hidden border-l border-t border-white/10 bg-black/75 px-8 py-6 backdrop-blur-sm lg:block">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-zinc-500">Your night. Your access.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-10 flex items-end justify-between gap-5 border-b border-white/10 pb-7">
          <div><p className="eyebrow mb-3">Curated for now</p><h2 className="text-4xl font-black uppercase text-white sm:text-6xl">Tonight&apos;s picks</h2></div>
          <Link href="/events" className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-zinc-400 hover:text-white sm:flex">All events <ArrowRight size={15} /></Link>
        </div>
        {issue ? <CatalogUnavailable issue={issue}/> : events.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div>
        ) : (
          <div className="border border-white/10 px-6 py-16 text-center"><CalendarDays className="mx-auto mb-5 text-zinc-600" /><h3 className="text-2xl font-black uppercase">The next night is loading</h3><p className="mt-2 text-zinc-500">New events will appear here as soon as they go live.</p></div>
        )}
      </section>

      <section className="border-y border-white/10 bg-[#090909] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-6 md:grid-cols-2 md:items-end">
            <div><p className="eyebrow mb-3">Places with a pulse</p><h2 className="text-4xl font-black uppercase text-white sm:text-6xl">Discover the venues</h2></div>
            <p className="max-w-md text-sm leading-6 text-zinc-500 md:justify-self-end">Rooms selected for their sound, energy and hospitality.</p>
          </div>
          {issue && <CatalogUnavailable issue={issue}/>}
          <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-2">
            {venues.map((venue) => (
              <Link key={venue.id} href={`/events?venue=${encodeURIComponent(venue.name)}`} className="group relative min-h-[390px] overflow-hidden bg-black">
                <Image src={venue.image} alt={venue.name} fill className="object-cover opacity-65 transition duration-700 group-hover:scale-105 group-hover:opacity-80" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
                  <div className="flex items-end justify-between gap-5"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-zinc-300"><MapPin size={14} /> {venue.location}</p><h3 className="text-3xl font-black uppercase text-white sm:text-4xl">{venue.name}</h3></div><ArrowRight className="mb-1 transition-transform group-hover:translate-x-1" /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 border-t border-white/10 pt-12 md:grid-cols-[1fr_1.4fr]">
          <p className="eyebrow">The ARS standard</p>
          <div><h2 className="max-w-3xl text-3xl font-black uppercase leading-tight text-white sm:text-5xl">From selection to the door, access should feel effortless.</h2><div className="mt-10 grid gap-8 sm:grid-cols-3">{[['01','Choose your night'],['02','Pay securely'],['03','Present your pass']].map(([n,label]) => <div key={n} className="border-t border-white/15 pt-4"><span className="text-xs text-[#cbb88a]">{n}</span><p className="mt-3 text-sm font-bold uppercase tracking-wide text-zinc-200">{label}</p></div>)}</div></div>
        </div>
      </section>
    </div>
  );
}
