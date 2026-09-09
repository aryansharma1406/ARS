'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Ticket, ShieldAlert } from 'lucide-react';
import { Event } from '@/lib/types';
import { formatINR, formatDate, formatTime } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  sourceCode?: string;
}

export default function EventCard({ event, sourceCode }: EventCardProps) {
  const remaining = Math.max(0, event.ticket_capacity - event.tickets_sold);
  const isSellingFast = remaining < 100 && remaining > 0;
  const isSoldOut = remaining <= 0;

  const detailUrl = `/events/${event.id}${sourceCode ? `?source=${sourceCode}` : ''}`;
  const bookUrl = `/checkout/${event.id}${sourceCode ? `?source=${sourceCode}` : ''}`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group relative">
      {/* Image Container */}
      <div className="relative h-52 w-full overflow-hidden">
        <Image
          src={event.image}
          alt={event.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-border text-[11px] font-semibold text-accent-cyan">
          {event.category}
        </div>

        {/* Age Limit Badge */}
        <div className="absolute top-3 right-3 bg-surface/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-border text-[11px] font-bold text-gray-200">
          {event.age_limit}+ Entry
        </div>

        {/* Availability Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {isSoldOut ? (
            <span className="bg-red-950/80 border border-red-500/50 text-red-400 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              SOLD OUT
            </span>
          ) : isSellingFast ? (
            <span className="bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-md animate-pulse">
              🔥 ONLY {remaining} LEFT
            </span>
          ) : (
            <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
              {remaining} Tickets Available
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-accent-pink transition-colors line-clamp-1">
            {event.name}
          </h3>
          <p className="text-xs text-accent-purple font-semibold mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {event.venue_name || "Club Xtreme, Tito's Lane, Goa"}
          </p>

          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Event Date & Time details */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 bg-surface/60 p-2.5 rounded-xl border border-border/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent-pink" />
            <span>{formatTime(event.start_time)}</span>
          </div>
        </div>

        {/* Pricing and Action */}
        <div className="pt-2 flex items-center justify-between border-t border-border/50">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-medium">Entry Ticket</span>
            <span className="text-xl font-black text-white">{formatINR(event.ticket_price)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={detailUrl}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-surface hover:text-white hover:bg-surface-hover border border-border transition-colors"
            >
              Details
            </Link>
            
            <Link
              href={isSoldOut ? '#' : bookUrl}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isSoldOut
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-accent-purple to-accent-pink text-white hover:opacity-90 shadow-accent-purple/20'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              {isSoldOut ? 'Sold Out' : 'Book Now'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
