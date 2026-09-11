import EventCreateForm from '@/components/owner/EventCreateForm';
import { Empty,PageHeader,Panel } from '@/components/owner/OwnerUI';
import { getOwnerVenueData } from '@/lib/owner-data';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export default async function OwnerEvents({ searchParams }: { searchParams: Promise<{ venue?: string; status?: string }> }) {
  const { venue, status } = await searchParams;
  const data = await getOwnerVenueData(venue);
  const filtered = status ? data.events.filter(event => event.published === (status === 'published')) : data.events;

  return (
    <>
      <PageHeader
        eyebrow="Venue programming"
        title="Events"
        description="Create, edit, publish and monitor events for this venue only."
        action={<EventCreateForm venueId={data.venue.id} />}
      />

      <Panel title={`${filtered.length} venue events`}>
        {filtered.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
              <Link href={`/owner/events?venue=${data.venue.id}`} className={`ars-button ${!status ? 'ars-button-secondary' : ''}`}>All</Link>
              <Link href={`/owner/events?venue=${data.venue.id}&status=published`} className={`ars-button ${status === 'published' ? 'ars-button-secondary' : ''}`}>Published</Link>
              <Link href={`/owner/events?venue=${data.venue.id}&status=draft`} className={`ars-button ${status === 'draft' ? 'ars-button-secondary' : ''}`}>Draft</Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((e) => (
                <article key={e.id} className="ars-card overflow-hidden border border-white/10 transition hover:border-accent-cyan/50">
                  <div className="grid grid-cols-[110px_1fr]">
                    <div className="relative min-h-32">
                      <CatalogImage src={e.image} alt={e.name} className="object-cover" sizes="110px" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-black uppercase text-white">{e.name}</h2>
                        <span className={`text-[10px] font-black uppercase ${e.published ? 'text-emerald-400' : 'text-zinc-600'}`}>{e.published ? 'Published' : 'Draft'}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{formatDate(e.date)} · {formatTime(e.start_time)} - {formatTime(e.end_time)}</p>
                      <p className="mt-4 text-sm text-zinc-400">{e.tickets_sold} / {e.ticket_capacity} sold · {formatINR(e.ticket_price)}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <EventCreateForm mode="edit" venueId={data.venue.id} event={e} />
                        <Link href={`/owner/events/${e.id}?venue=${data.venue.id}`} className="ars-button">Open analytics</Link>
                        <Link href={`/owner/events/${e.id}?venue=${data.venue.id}`} className="ars-button ars-button-secondary flex items-center gap-2"><BarChart3 size={14} /> Insights</Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <Empty title="No events yet" copy="Create your first event to start selling." action={<EventCreateForm venueId={data.venue.id} />} />
        )}
      </Panel>
    </>
  );
}
