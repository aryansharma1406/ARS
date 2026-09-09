import EventTicketSelector from '@/components/EventTicketSelector';
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
import Image from 'next/image';
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
  const isSoldOut = remaining <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28 lg:pb-8">
      
      {/* Back button */}
      <div>
        <Link 
          href={`/events${sourceCode ? `?source=${sourceCode}` : ''}`} 
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Events
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Event Media & Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Banner Image */}
          <div className="relative h-[28rem] sm:h-[34rem] w-full overflow-hidden border border-border">
            <Image
              src={event.image}
              alt={event.name}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            
            <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border text-xs font-bold text-accent-cyan">
              {event.category}
            </div>

            <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border text-xs font-bold text-white">
              {event.age_limit}+ Age Restriction
            </div>
          </div>

          {/* Event Header */}
          <div className="space-y-3">
            {sourceCode && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-pink/10 border border-accent-pink/30 text-xs font-bold text-accent-pink">
                <Sparkles className="w-3.5 h-3.5" /> Direct Promoter Link: {sourceCode}
              </div>
            )}
            <h1 className="text-4xl sm:text-6xl font-display font-black uppercase text-white leading-[.95]">
              {event.name}
            </h1>
            <p className="text-sm font-semibold text-accent-purple flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {event.venue_name || "Club Xtreme, Tito's Lane, Baga, Calangute, Goa"}
            </p>
          </div>

          {/* Quick Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl glass-panel border border-border/80 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Date</span>
              <strong className="text-white text-sm flex items-center gap-1">
                <Calendar className="w-4 h-4 text-accent-cyan" /> {formatDate(event.date)}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Doors Open</span>
              <strong className="text-white text-sm flex items-center gap-1">
                <Clock className="w-4 h-4 text-accent-pink" /> {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Availability</span>
              <strong className={isSoldOut ? "text-red-400 text-sm" : "text-accent-emerald text-sm"}>
                {isSoldOut ? 'Sold Out' : `${remaining} Tickets Left`}
              </strong>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-xl font-black uppercase text-white">About the night</h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Venue & Guidelines */}
          <div className="p-6 rounded-2xl glass-card space-y-4 border border-border">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-accent-gold" /> Club Guidelines & Dress Code
            </h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Closed shoes and smart night casuals mandatory for male entry.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Physical original ID (Aadhaar / Driving License / Passport) required at door.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Digital QR pass must be shown at Club Xtreme main entrance scanner.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Strictly 21+ age limit for alcoholic beverage service.
              </li>
            </ul>
          </div>

        </div>

        {/* Right Column: Ticket Selection & Checkout Card */}
        <div className="lg:col-span-5 sticky top-24">
          <EventTicketSelector 
            event={event} 
            sourceCode={sourceCode} 
            remaining={remaining} 
          />
        </div>

      </div>

    </div>
  );
}
