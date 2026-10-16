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
      <div className="event-quick-details" aria-label="Event details">
        <p><Calendar size={14}/><span>Date</span><strong>{formatDate(event.date)}</strong></p>
        <p><Clock size={14}/><span>Time</span><strong>{formatTime(event.start_time)} IST</strong></p>
        <p><MapPin size={14}/><span>Venue</span><strong><SearchHighlight>{event.venue_name || 'Venue to be announced'}</SearchHighlight></strong></p>
        <p><MapPin size={14}/><span>City</span><strong><SearchHighlight>{event.venue_location || 'Location to be announced'}</SearchHighlight></strong></p>
      </div>
      {featured && <p className="event-description">{event.description}</p>}
      <div className="event-card-booking"><div><span>From</span><strong>{formatINR(event.ticket_price)}</strong></div>{soldOut ? <span className="eyebrow">Sold out</span> : <Link href={bookUrl} className="event-access">Get access <ArrowUpRight size={16}/></Link>}</div>
      <p className={`event-remaining ${soldOut ? 'is-sold-out' : ''}`}>{soldOut ? 'Sold out' : `${remaining} pass${remaining === 1 ? '' : 'es'} available`}</p>
    </div>
  </article>;
}
