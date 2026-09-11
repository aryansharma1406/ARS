'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@/lib/types';
import { eventPhase, eventWindow } from '@/lib/event-schedule';
import EventCard from '@/components/EventCard';
import { Calendar } from 'lucide-react';

export default function UpcomingEvents({ events, sourceCode, initialNow }: { events: Event[]; sourceCode: string; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const current = Date.now();
    const nextEnd = Math.min(...events.map(event => eventWindow(event).end).filter(end => end > current));
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(60000, nextEnd - current + 1)));
    const refresh = () => setNow(Date.now());
    window.addEventListener('focus', refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); };
  }, [events, now]);
  const visible = events.filter(event => event.published && ['upcoming', 'live'].includes(eventPhase(event, now)))
    .sort((a, b) => eventWindow(a).start - eventWindow(b).start);

  if (!visible.length) return (
    <section className="ars-card p-12 text-center space-y-4">
      <Calendar className="w-8 h-8 mx-auto text-[#cbb88a]" />
      <h3 className="text-xl font-black text-white uppercase">No upcoming events found</h3>
      <p className="text-sm text-zinc-400 max-w-sm mx-auto">No upcoming or live events match your filters. Try another date or check back for the next line-up.</p>
    </section>
  );
  return (
    <section className="space-y-8">
      <p className="eyebrow">The line-up / {visible.length} event{visible.length === 1 ? '' : 's'}</p>
      <EventCard event={visible[0]} sourceCode={sourceCode} featured />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{visible.slice(1).map(event => <EventCard key={event.id} event={event} sourceCode={sourceCode} />)}</div>
    </section>
  );
}
