'use client';
import { SearchHighlight } from '@/components/LiveSearch';

import { Event } from '@/lib/types';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import { ArrowUpRight,Calendar,Clock,MapPin } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';

export default function EventCard({ event, sourceCode, featured = false }: { event: Event; sourceCode?: string; featured?: boolean }) {
  const remaining = Math.max(0, event.ticket_capacity - event.tickets_sold);
  const soldOut = remaining <= 0;
  const detailUrl = `/events/${event.id}${sourceCode ? `?source=${encodeURIComponent(sourceCode)}` : ''}`;
  const bookUrl = `/checkout/${event.id}${sourceCode ? `?source=${encodeURIComponent(sourceCode)}` : ''}`;

  return (
    <article className={`group overflow-hidden border border-white/10 bg-[#0d0d0c] transition-colors hover:border-[#cbb88a]/50 ${featured ? 'event-featured' : ''}`}>
      <Link href={detailUrl} className="event-image relative block aspect-[4/5] overflow-hidden">
        <CatalogImage src={event.image} alt={event.name} className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width:768px) 100vw,(max-width:1200px) 50vw,33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 ars-chip px-3 py-1 text-[10px]"><SearchHighlight>{event.category}</SearchHighlight></div>
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-zinc-300"><MapPin size={14} /> <SearchHighlight>{event.venue_name}</SearchHighlight></p>
          <h3 className="event-title text-3xl font-black uppercase leading-none text-white"><SearchHighlight>{event.name}</SearchHighlight></h3>
        </div>
      </Link>
      <div className="event-copy p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 border-b border-white/10 pb-5 text-xs text-zinc-400">
          <span className="flex items-center gap-2"><Calendar size={14} className="text-[#cbb88a]" />{formatDate(event.date)}</span>
          <span className="flex items-center gap-2"><Clock size={14} className="text-[#cbb88a]" />{formatTime(event.start_time)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-5">
          <div><span className="block text-[11px] uppercase tracking-[.13em] text-zinc-500">From</span><strong className="text-xl text-white">{formatINR(event.ticket_price)}</strong></div>
          {soldOut ? <span className="text-xs font-bold uppercase tracking-[.12em] text-zinc-500">Sold out</span> : <Link href={bookUrl} className="flex min-h-11 items-center gap-2 border border-white/25 px-4 text-xs font-bold uppercase tracking-[.12em] text-white transition hover:bg-white hover:text-black">Get access <ArrowUpRight size={15} /></Link>}
        </div>
        {!soldOut && remaining < 100 && <p className="mt-4 text-xs font-semibold uppercase tracking-[.1em] text-[#cbb88a]">{remaining} passes remaining</p>}
      </div>
    </article>
  );
}
