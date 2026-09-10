import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { getPublicCatalog } from '@/lib/catalog';
import CatalogUnavailable from '@/components/CatalogUnavailable';
import { Calendar,Filter,MapPin,Search } from 'lucide-react';

interface EventsPageProps {
  searchParams: Promise<{
    venue?: string;
    category?: string;
    source?: string;
    query?: string;
    price?: string;
    date?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const {events, venues, issue} = await getPublicCatalog();

  const venueFilter = params.venue || '';
  const categoryFilter = params.category || '';
  const sourceCode = params.source || '';
  const searchQuery = (params.query || '').toLowerCase();
  const priceMax = params.price ? parseInt(params.price, 10) : 10000;

  const categories = [...new Set(events.map(event => event.category))].sort();

  // Discovery filters only; catalog and purchase rules are unchanged.
  const filteredEvents = events.filter(evt => {
    if (params.date && evt.date !== params.date) return false;
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
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className="eyebrow">Find your night</div>
        <h1 className="text-6xl sm:text-8xl font-black uppercase text-white">Events</h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Find your next night out.
          {sourceCode && <span className="mt-2 block text-accent-cyan font-black uppercase tracking-[.16em]">Promoter referral: <code className="ars-chip">{sourceCode}</code></span>}
        </p>
      </section>

      {/* Filter Toolbar */}
      <section className="ars-card p-4 sm:p-6 space-y-4">
        <form method="GET" action="/events" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sourceCode && <input type="hidden" name="source" value={sourceCode} />}

          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="query"
              defaultValue={params.query || ''}
              aria-label="Search events" placeholder="Search event or venue"
              className="ars-input !pl-10"
            />
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              aria-label="Filter by venue" name="venue"
              defaultValue={venueFilter}
              className="ars-select !pl-10"
            >
              <option value="">All venues</option>
              {venues.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.location})</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              aria-label="Filter by genre" name="category"
              defaultValue={categoryFilter}
              className="ars-select !pl-10"
            >
              <option value="">All music genres</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 text-xs text-zinc-400 lg:col-span-2">Date<input className="ars-input" aria-label="Filter by date" type="date" name="date" defaultValue={params.date || ''}/></label>
          {params.price && <input type="hidden" name="price" value={params.price}/>}
          <Link href={sourceCode ? `/events?source=${encodeURIComponent(sourceCode)}` : '/events'} className="ars-button ars-button-secondary">Clear filters</Link>
          <button
            type="submit"
            className="ars-button"
          >
            Apply filters
          </button>
        </form>
      </section>

      {issue ? <CatalogUnavailable issue={issue}/> : filteredEvents.length === 0 ? (
        <section className="ars-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-black mx-auto flex items-center justify-center border border-white/10 text-zinc-500">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white uppercase">No events found</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">No live events match these filters. Adjust your search and find another night.</p>
        </section>
      ) : (
        <section className="space-y-8">
          <p className="eyebrow">The line-up / {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}</p>
          <EventCard event={filteredEvents[0]} sourceCode={sourceCode} featured />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredEvents.slice(1).map(evt => <EventCard key={evt.id} event={evt} sourceCode={sourceCode}/>)}</div>
        </section>
      )}

    </div>
  );
}
