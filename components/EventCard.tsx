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
  return <article className={`event-editorial group ${featured ? 'event-featured' : ''}`}>
    <Link href={detailUrl} className="event-image relative block overflow-hidden" aria-label={`View ${event.name}`}>
      <CatalogImage src={event.image} alt={event.name} className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]" sizes={featured ? '(max-width:768px) 100vw,60vw' : '(max-width:768px) 100vw,(max-width:1200px) 50vw,33vw'} />
      <div className="event-image-shade"/><span className="event-date-stamp"><Calendar size={13}/>{formatDate(event.date)}</span><span className="event-image-arrow"><ArrowUpRight size={22}/></span>
    </Link>
    <div className="event-copy">
      <p className="eyebrow"><SearchHighlight>{event.category}</SearchHighlight></p>
      <h3 className="event-title"><Link href={detailUrl}><SearchHighlight>{event.name}</SearchHighlight></Link></h3>
      <p className="event-venue"><MapPin size={14}/><SearchHighlight>{event.venue_name}</SearchHighlight></p>
      {featured && <p className="event-description">{event.description}</p>}
      <div className="event-time"><Clock size={14}/>{formatTime(event.start_time)} <span>/ IST</span></div>
      <div className="event-card-booking"><div><span>From</span><strong>{formatINR(event.ticket_price)}</strong></div>{soldOut ? <span className="eyebrow">Sold out</span> : <Link href={bookUrl} className="event-access">Get access <ArrowUpRight size={16}/></Link>}</div>
      {!soldOut && remaining < 100 && <p className="event-remaining">{remaining} passes remaining</p>}
    </div>
  </article>;
}
