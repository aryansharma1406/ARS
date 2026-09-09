import React from 'react';
import { getEvents, getVenues } from '@/lib/store';
import EventCard from '@/components/EventCard';
import { Search, Filter, Calendar, MapPin, Sparkles } from 'lucide-react';

interface EventsPageProps {
  searchParams: Promise<{
    venue?: string;
    category?: string;
    source?: string;
    query?: string;
    price?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const events = await getEvents();
  const venues = await getVenues();

  const venueFilter = params.venue || '';
  const categoryFilter = params.category || '';
  const sourceCode = params.source || '';
  const searchQuery = (params.query || '').toLowerCase();
  const priceMax = params.price ? parseInt(params.price, 10) : 10000;

  // Filter logic
  const filteredEvents = events.filter(evt => {
    if (venueFilter && !evt.venue_name?.toLowerCase().includes(venueFilter.toLowerCase())) {
      return false;
    }
    if (categoryFilter && !evt.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery && !(
      evt.name.toLowerCase().includes(searchQuery) || 
      evt.description.toLowerCase().includes(searchQuery) ||
      evt.venue_name?.toLowerCase().includes(searchQuery)
    )) {
      return false;
    }
    if (evt.ticket_price > priceMax) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/30 text-xs font-bold text-accent-purple">
          <Sparkles className="w-3.5 h-3.5" /> Goa Nightlife Events
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-black text-white">
          All Active Club Passes
        </h1>
        <p className="text-sm text-gray-400 max-w-xl">
          Browse upcoming techno raves, Bollywood nights, and poolside parties across Goa.
          {sourceCode && (
            <span className="block mt-2 font-semibold text-accent-pink">
              🏷️ Promoter Referral Code active: <code className="bg-surface px-2 py-0.5 rounded border border-border">{sourceCode}</code>
            </span>
          )}
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 border border-border">
        <form method="GET" action="/events" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sourceCode && <input type="hidden" name="source" value={sourceCode} />}
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="query"
              defaultValue={params.query || ''}
              placeholder="Search event or artist..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
            />
          </div>

          {/* Venue Selector */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              name="venue"
              defaultValue={venueFilter}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple appearance-none cursor-pointer"
            >
              <option value="">All Venues (Goa)</option>
              {venues.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.location})</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              name="category"
              defaultValue={categoryFilter}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple appearance-none cursor-pointer"
            >
              <option value="">All Music Genres</option>
              <option value="Techno">Melodic Techno / EDM</option>
              <option value="House">Deep House</option>
              <option value="Bollywood">Bollywood / Commercial</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all"
            >
              Apply Filters
            </button>
          </div>

        </form>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-border">
          <div className="w-16 h-16 rounded-2xl bg-surface mx-auto flex items-center justify-center border border-border text-gray-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Events Found</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            No active club events match your current filter parameters. Try clearing your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(evt => (
            <EventCard key={evt.id} event={evt} sourceCode={sourceCode} />
          ))}
        </div>
      )}

    </div>
  );
}
