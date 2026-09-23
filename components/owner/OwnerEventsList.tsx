'use client';
import { eventPhase,matchesEventStatus,eventWindow } from '@/lib/event-schedule';



import EventCreateForm from '@/components/owner/EventCreateForm';
import { Empty,PageHeader,Panel } from '@/components/owner/OwnerUI';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import type {Event} from '@/lib/types';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

const statuses = ['all', 'upcoming', 'live', 'past', 'published', 'draft'];

export default function OwnerEventsList({events,metrics,venueId,initialNow}:{events:Event[];metrics:Record<string,{sold:number;revenue:number;checkins:number}>;venueId:string;initialNow:number}) {
  const searchParams=useSearchParams();
  const requestedStatus=searchParams.get('status')||'all';
  const status=statuses.includes(requestedStatus)?requestedStatus:'all';
  const [now,setNow]=useState(initialNow);
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),30000);
    return()=>window.clearInterval(timer);
  },[]);
  const data={events,venue:{id:venueId}};
  const filtered=events.filter(event=>matchesEventStatus(event,status,now));
  if(status==='past')filtered.sort((a,b)=>eventWindow(b).start-eventWindow(a).start||a.id.localeCompare(b.id));
  function selectStatus(value:string){
    const url=new URL(window.location.href);
    url.searchParams.set('venue',venueId);
    url.searchParams.set('status',value);
    window.history.pushState(null,'',url.pathname+url.search+url.hash);
    setNow(Date.now());
  }

  return (
    <>
      <PageHeader
        eyebrow="Venue programming"
        title="Events"
        description="Create, edit, publish and monitor events for this venue only."
        action={<EventCreateForm venueId={data.venue.id} />}
      />

      <div className="mb-5 flex flex-wrap gap-2" aria-label="Event status filters">
        {statuses.map(value => (
          <button key={value} type="button" onClick={()=>selectStatus(value)} aria-pressed={status===value} className={`ars-button ${status===value?'':'ars-button-secondary'}`}>{value}</button>
        ))}
      </div>
      <Panel title={`${filtered.length} venue events`}>
        {filtered.length ? (
          <div className="space-y-4">
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
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-accent-purple">{eventPhase(e, now)==='past'?'Completed':eventPhase(e, now)} / IST</p>
                      <p className="mt-2 text-xs text-zinc-500">{formatDate(e.date)} · {formatTime(e.start_time)} - {formatTime(e.end_time)}</p>
                      <p className="mt-4 text-sm text-zinc-400">{metrics[e.id]?.sold??'Unavailable'} / {e.ticket_capacity} sold · From {formatINR(e.ticket_price)}</p>
                      <p className="mt-2 text-xs text-zinc-400">Revenue: {metrics[e.id]?formatINR(metrics[e.id].revenue):'Unavailable'} · Check-ins: {metrics[e.id]?.checkins??'Unavailable'}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {eventPhase(e,now)!=='past'&&<EventCreateForm mode="edit" venueId={data.venue.id} event={e} />}
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
          <Empty title={status==='past'?'No completed events':'No matching events'} copy="Choose another status to view more events." />
        )}
      </Panel>
      <p className="mt-4 text-xs text-zinc-500">Sales and revenue use paid bookings, including test bookings. Revenue is after discounts and excludes fees. Check-ins count used paid passes, not scan attempts. Capacity is configured inventory, not live occupancy. Completed events are read-only.</p>
    </>
  );
}
