import FunnelObservation from '@/components/FunnelObservation';
import EventTicketSelector from '@/components/EventTicketSelector';
import {getEventPassTiers} from '@/lib/event-pass-tiers';
import { getEventById } from '@/lib/store';
import { formatDate,formatTime } from '@/lib/utils';
import {
ArrowLeft,
Calendar,
CheckCircle2,
Clock,MapPin,
ShieldAlert,
Sparkles
} from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface EventDetailPageProps {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    source?: string;
  }>;
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { eventId } = await params;
  const { source: sourceCode } = await searchParams;

  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }

  const remaining = Math.max(0, event.ticket_capacity - event.tickets_sold);
  const tiers = await getEventPassTiers(event.id);
  const isSoldOut = remaining <= 0;

  return (
    <div className="event-detail-page mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-28 lg:pb-8">
      <FunnelObservation eventId={event.id} kind="event_view" source={sourceCode}/>
      <Link
        href={`/events${sourceCode ? `?source=${encodeURIComponent(sourceCode)}` : ''}`}
        className="ars-button ars-button-secondary inline-flex w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back to all events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative h-[26rem] sm:h-[38rem] w-full overflow-hidden border border-white/10">
            <CatalogImage
              src={event.image}
              alt={event.name}
              priority
              className="object-cover" sizes="(max-width:1024px) 100vw,60vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-sm border border-white/15 text-xs font-black uppercase tracking-[.12em] text-accent-cyan">
              {event.category}
            </div>

            <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-sm border border-white/15 text-xs font-black text-white">
              {event.age_limit}+ age restriction
            </div>
          </div>

          <div className="space-y-3">
            {sourceCode && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-accent-pink/10 border border-accent-pink/30 text-xs font-black text-accent-pink uppercase tracking-[.12em]">
                <Sparkles className="w-3.5 h-3.5" /> Direct promoter link: {sourceCode}
              </div>
            )}
            <h1 className="text-5xl sm:text-7xl font-black uppercase text-white leading-[.95] tracking-[-.06em]">{event.name}</h1>
            <p className="text-sm font-semibold text-accent-cyan flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {event.venue_name || 'Venue details to be announced'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border-y border-white/15 py-6 text-xs">
            <div>
              <span className="text-zinc-400 block mb-1">Date</span>
              <strong className="text-white text-sm flex items-center gap-1">
                <Calendar className="w-4 h-4 text-accent-cyan" /> {formatDate(event.date)}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block mb-1">Doors open</span>
              <strong className="text-white text-sm flex items-center gap-1">
                <Clock className="w-4 h-4 text-accent-pink" /> {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block mb-1">Availability</span>
              <strong className={isSoldOut ? 'text-red-400 text-sm' : 'text-accent-emerald text-sm'}>
                {isSoldOut ? 'Sold out' : `${remaining} Tickets left`}
              </strong>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-black uppercase text-white">About the night</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          <div className="space-y-4 ars-card border-white/10 p-6">
            <h3 className="text-base font-black text-white flex items-center gap-2 uppercase">
              <ShieldAlert className="w-5 h-5 text-accent-gold" /> Club guidelines & dress code
            </h3>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Closed shoes and smart night casuals mandatory for male entry.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Physical original ID (Aadhaar / Driving License / Passport) required at door.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Digital QR pass must be shown at the main entrance scanner.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Strictly {event.age_limit}+ age limit for alcohol service.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <EventTicketSelector event={event} sourceCode={sourceCode} remaining={remaining} tiers={tiers} />
        </div>
      </div>
    </div>
  );
}
