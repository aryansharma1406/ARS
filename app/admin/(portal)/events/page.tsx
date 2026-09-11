'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { addEvent,getEvents,getVenues,updateEvent } from '@/lib/store';
import { Event,Venue } from '@/lib/types';
import { eventPhase,matchesEventStatus } from '@/lib/event-schedule';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import { CalendarDays,Clock,Eye,EyeOff,Plus } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import React,{ useCallback,useEffect,useState } from 'react';

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setScheduleNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const visibleEvents = events.filter(event => matchesEventStatus(event, statusFilter, scheduleNow));
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    venue_id: '',
    category: 'Melodic Techno',
    description: '',
    image: '',
    date: '2026-09-04',
    start_time: '21:00',
    end_time: '04:00',
    ticket_price: 1499,
    ticket_capacity: 400,
    age_limit: 21,
  });

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
    const evts = await getEvents();
    const vns = await getVenues();
    setEvents(evts);
    setVenues(vns);
    if (vns.length > 0) {
      setFormData(prev => prev.venue_id ? prev : ({ ...prev, venue_id: vns[0].id }));
    }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await addEvent({
      ...formData,
      ticket_price: Number(formData.ticket_price),
      ticket_capacity: Number(formData.ticket_capacity),
      age_limit: Number(formData.age_limit),
      published: true,
    });
    setIsModalOpen(false);
    loadData();
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    await updateEvent(id, { published: !currentPublished });
    loadData();
  };

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadData()}>Retry loading</button></div> : !events.length && <EmptyState title="No events to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">Events & ticket pricing</h2>
          <p className="text-xs text-zinc-400">Create, edit, and publish nightclub lineups.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="ars-button flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Event</button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Event status filters">
        {['all', 'upcoming', 'live', 'past', 'published', 'draft'].map(status => (
          <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={`ars-button ${statusFilter === status ? '' : 'ars-button-secondary'}`}>{status}</button>
        ))}
      </div>
      {events.length > 0 && !visibleEvents.length && <EmptyState title="No matching events" copy="Choose another status to view your events." />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleEvents.map((evt) => (
          <div key={evt.id} className="ars-card rounded-3xl overflow-hidden flex flex-col justify-between">
            <div className="relative h-44 w-full">
              <CatalogImage src={evt.image} alt={evt.name} className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-accent-cyan border border-white/15">{evt.category}</div>
              <div className="absolute top-3 right-3">
                <button onClick={() => handleTogglePublish(evt.id, evt.published)} className={`px-2.5 py-1 rounded-full text-[10px] font-black ${evt.published ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}>
                  {evt.published ? <><Eye className="w-3 h-3 text-emerald-400" /> Published</> : <><EyeOff className="w-3 h-3" /> Draft</>}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-white line-clamp-1">{evt.name}</h3>
                <p className="text-xs text-accent-purple font-semibold mt-0.5">{evt.venue_name || "Club Xtreme, Tito's Lane"}</p>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{evt.description}</p>
              </div>
                  <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-purple">{eventPhase(evt, scheduleNow)} / IST</p>
                    <div className="flex items-center gap-2 text-zinc-200">
                      <CalendarDays className="h-4 w-4 shrink-0 text-accent-purple" aria-hidden="true" />
                      <span>{evt.date ? formatDate(`${evt.date}T12:00:00`) : 'Date to be confirmed'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="h-4 w-4 shrink-0 text-accent-purple" aria-hidden="true" />
                      <span>
                        {evt.start_time ? formatTime(evt.start_time) : 'Time to be confirmed'}
                        {evt.end_time && ` - ${formatTime(evt.end_time)}`}
                        {evt.start_time && evt.end_time && evt.end_time.slice(0,5) < evt.start_time.slice(0,5) && ' (next day)'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-black/40 border border-white/10">
                <div><span className="text-zinc-500 block text-[10px]">Entry price</span><strong className="text-white text-sm">{formatINR(evt.ticket_price)}</strong></div>
                <div><span className="text-zinc-500 block text-[10px]">Capacity sold</span><strong className="text-accent-pink text-sm">{evt.tickets_sold} / {evt.ticket_capacity}</strong></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="ars-card max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-white">Create nightclub event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="ars-label">Event name</label>
                <input type="text" required placeholder="Saturday Techno Rave" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ars-label">Assigned venue</label>
                  <select value={formData.venue_id} onChange={e => setFormData({ ...formData, venue_id: e.target.value })} className="ars-select">
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.location})</option>)}
                  </select>
                </div>
                <div>
                  <label className="ars-label">Genre category</label>
                  <input type="text" required placeholder="Melodic Techno / EDM" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="ars-input" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="ars-label">Event date</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="ars-input" /></div>
                <div><label className="ars-label">Start time</label><input type="time" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="ars-input" /></div>
                <div><label className="ars-label">End time</label><input type="time" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="ars-input" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="ars-label">Ticket price (₹)</label><input type="number" required placeholder="1499" value={formData.ticket_price} onChange={e => setFormData({ ...formData, ticket_price: Number(e.target.value) })} className="ars-input" /></div>
                <div><label className="ars-label">Capacity</label><input type="number" required placeholder="400" value={formData.ticket_capacity} onChange={e => setFormData({ ...formData, ticket_capacity: Number(e.target.value) })} className="ars-input" /></div>
                <div><label className="ars-label">Age limit</label><input type="number" required placeholder="21" value={formData.age_limit} onChange={e => setFormData({ ...formData, age_limit: Number(e.target.value) })} className="ars-input" /></div>
              </div>

              <div><label className="ars-label">Cover image URL</label><input type="url" required placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Description</label><textarea rows={3} required placeholder="Event details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ars-textarea" /></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" className="ars-button w-1/2">Publish Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
