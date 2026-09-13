'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { addEvent,getEvents,getBusinessVenues as getVenues,updateEvent } from '@/lib/store';
import {getAdminEventMetrics} from '@/lib/admin-event-metrics';
import {LiveSearchInput,SearchHighlight} from '@/components/LiveSearch';
import {matchesSearch} from '@/lib/search';
import { Event,Venue } from '@/lib/types';
import { eventPhase,matchesEventStatus,eventWindow } from '@/lib/event-schedule';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import { CalendarDays,Clock,Eye,EyeOff,Plus } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import PassTierEditor from '@/components/PassTierEditor';
import {defaultPassTier,editableTiers,type PassTierInput} from '@/lib/pass-tiers';
import {getManagedPassTiers} from '@/lib/event-pass-tiers';
import React,{ useCallback,useEffect,useState } from 'react';

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [statusFilter, setStatusFilter] = useState('live');
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setScheduleNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [search,setSearch]=useState('');
  const [venueFilter,setVenueFilter]=useState('all');
  const [genre,setGenre]=useState('all');
  const [dateFilter,setDateFilter]=useState('');
  const [publication,setPublication]=useState('all');
  const [sort,setSort]=useState('upcoming');
  const [metrics,setMetrics]=useState<Awaited<ReturnType<typeof getAdminEventMetrics>>>([]);
  const [metricError,setMetricError]=useState('');
  const [editing,setEditing]=useState<Event|null>(null);
  const [duplicate,setDuplicate]=useState(false);
  const [viewing,setViewing]=useState<Event|null>(null);
  const [published,setPublished]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [actionError,setActionError]=useState('');
  const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(n);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tiers,setTiers]=useState<PassTierInput[]>([defaultPassTier(1499,400)]);

  const [formData, setFormData] = useState({
    name: '',
    venue_id: '',
    category: 'Melodic Techno',
    description: '',
    image: '',
    date: new Date(Date.now()+330*60000).toISOString().slice(0,10),
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
    try { setMetrics(await getAdminEventMetrics());setMetricError(''); } catch { setMetrics([]);setMetricError('Sales metrics are unavailable. Event management remains available.'); }
    if (vns.length > 0) {
      setFormData(prev => prev.venue_id ? prev : ({ ...prev, venue_id: vns[0].id }));
    }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const openForm=async(event:Event|null,copy=false)=>{
    setEditing(copy?null:event);setDuplicate(copy);setPublished(copy?false:event?.published??true);setSaveError('');
    setFormData({name:event?event.name+(copy?' (Copy)':''):'',venue_id:event?.venue_id||venues[0]?.id||'',category:event?.category||'Melodic Techno',description:event?.description||'',image:event?.image||'',date:copy?'':event?.date.slice(0,10)||new Date(Date.now()+330*60000).toISOString().slice(0,10),start_time:event?.start_time||'21:00',end_time:event?.end_time||'04:00',ticket_price:event?.ticket_price??1499,ticket_capacity:event?.ticket_capacity??400,age_limit:event?.age_limit??21});
    setTiers([]);setIsModalOpen(true);setSaving(true);
    try{setTiers(event?editableTiers(await getManagedPassTiers(event.id),copy):[defaultPassTier(1499,400)]);}catch(error){setSaveError(error instanceof Error?error.message:'Unable to load pass tiers.');}finally{setSaving(false);}
  };
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();if(saving)return;setSaving(true);setSaveError('');
    try {
      if(!tiers.length)throw new Error('Add at least one pass tier. If loading failed, close and reopen the editor.');
      const payload={...formData,tiers:editableTiers(tiers),ticket_price:Math.min(...tiers.map(t=>Number(t.price))),ticket_capacity:tiers.reduce((sum,t)=>sum+Number(t.capacity),0),age_limit:Number(formData.age_limit),published};
      if(editing)await updateEvent(editing.id,payload);else await addEvent(payload);
      setIsModalOpen(false);await loadData();
    }catch(error){setSaveError(error instanceof Error?error.message:'Unable to save event.');}finally{setSaving(false);}
  };
  const handleTogglePublish = async (id:string,currentPublished:boolean) => {
    if(busy)return;setBusy(id);setActionError('');
    try{await updateEvent(id,{published:!currentPublished});await loadData();}
    catch(error){setActionError(error instanceof Error?error.message:'Unable to update publication.');}finally{setBusy(null);}
  };
  const venueName=(event:Event)=>venues.find(v=>v.id===event.venue_id)?.name||event.venue_name||'Venue unavailable';
  const visibleEvents=events.filter(event=>matchesEventStatus(event,statusFilter,scheduleNow)&&(venueFilter==='all'||event.venue_id===venueFilter)&&(genre==='all'||event.category===genre)&&(!dateFilter||event.date.slice(0,10)===dateFilter)&&(publication==='all'||(publication==='published'?event.published:!event.published))&&matchesSearch(search,[event.name,venueName(event),event.category,event.description,event.id])).sort((a,b)=>{
    const time=(event:Event)=>{const n=eventWindow(event).start;return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER;};
    if(sort==='newest')return time(b)-time(a);
    if(sort==='oldest')return time(a)-time(b);
    const rank=(event:Event)=>({upcoming:0,live:1,past:2,unscheduled:3}[eventPhase(event,scheduleNow)]);
    return rank(a)-rank(b)||(eventPhase(a,scheduleNow)==='past'?time(b)-time(a):time(a)-time(b));
  });

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadData()}>Retry loading</button></div> : !events.length && <EmptyState title="No events to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">Events & ticket pricing</h2>
          <p className="text-xs text-zinc-400">Create, edit, and publish nightclub lineups.</p>
        </div>
        <button onClick={() => openForm(null)} className="ars-button flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Event</button>
      </div>

      {actionError&&<p role="alert" className="text-sm text-amber-200">{actionError}</p>}
      {metricError&&<p role="status" className="text-sm text-amber-200">{metricError}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Total Events',visibleEvents.length],['Upcoming',visibleEvents.filter(e=>eventPhase(e,scheduleNow)==='upcoming').length],['Live',visibleEvents.filter(e=>eventPhase(e,scheduleNow)==='live').length],['Tickets Sold',metricError?'Unavailable':visibleEvents.reduce((sum,e)=>sum+(metrics.find(m=>m.id===e.id)?.sold||0),0)],['Revenue',metricError?'Unavailable':money(visibleEvents.reduce((sum,e)=>sum+(metrics.find(m=>m.id===e.id)?.revenue||0),0))]].map(([label,value])=><div key={label} className="ars-card bg-gradient-to-br from-[#cbb88a]/[.07] to-transparent p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p><p className="mt-3 break-words text-xl font-semibold text-[#e2d4ae]">{value}</p></div>)}</div>
      <section className="ars-card space-y-4 p-4"><div className="flex flex-wrap gap-2" aria-label="Event timing filters">{['live','upcoming','past','all'].map(status=><button key={status} type="button" aria-pressed={statusFilter===status} onClick={()=>setStatusFilter(status)} className={`ars-button !px-4 !py-2 !text-xs ${statusFilter===status?'':'ars-button-secondary'}`}>{status==='all'?'All events':status}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><LiveSearchInput value={search} onChange={setSearch} placeholder="Search event, venue or genre" className="sm:col-span-2"/><select aria-label="Venue" value={venueFilter} onChange={e=>setVenueFilter(e.target.value)} className="ars-select"><option value="all">All venues</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><input aria-label="Event date (IST)" type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="ars-input [color-scheme:dark]"/><select aria-label="Genre" value={genre} onChange={e=>setGenre(e.target.value)} className="ars-select"><option value="all">All genres</option>{[...new Set(events.map(e=>e.category))].filter(Boolean).sort().map(g=><option key={g} value={g}>{g}</option>)}</select><select aria-label="Publication status" value={publication} onChange={e=>setPublication(e.target.value)} className="ars-select"><option value="all">Published & Draft</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-500" role="status">{visibleEvents.length} matching events</p><div className="flex flex-wrap items-center gap-3"><select aria-label="Sort events" value={sort} onChange={e=>setSort(e.target.value)} className="ars-select !w-auto"><option value="upcoming">Upcoming first</option><option value="oldest">Date: earliest first</option><option value="newest">Date: latest first</option></select><button type="button" onClick={()=>{setSearch('');setVenueFilter('all');setGenre('all');setDateFilter('');setPublication('all');setStatusFilter('live');setSort('upcoming');}} className="text-xs text-[#e2d4ae] underline underline-offset-4">Reset filters</button></div></div>
      </section>
      <details className="text-xs leading-6 text-zinc-500"><summary className="cursor-pointer text-[#e2d4ae]">About these figures</summary>Summary totals follow the filters. Revenue and tickets use paid bookings; revenue excludes fees and includes discounts and existing test bookings. Check-ins count used passes from paid bookings. Capacity uses the existing event inventory counter, not live occupancy. Event timing uses the existing IST scheduling rules, including overnight events.</details>
      {events.length>0&&!visibleEvents.length&&<EmptyState title="No matching events" copy="Try another search or adjust your filters."/>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleEvents.map(evt=>{
        const metric=metrics.find(m=>m.id===evt.id);const phase=eventPhase(evt,scheduleNow);const capacity=evt.ticket_capacity>0?Number(evt.tickets_sold)/evt.ticket_capacity*100:null;
        return <article key={evt.id} className="ars-card min-w-0 overflow-hidden"><div className="relative h-28"><CatalogImage src={evt.image} alt={evt.name} className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/20"/><div className="absolute inset-x-3 top-3 flex justify-between gap-2 text-[9px] uppercase tracking-wide"><span className="rounded-full border border-[#cbb88a]/30 bg-black/80 px-2 py-1 text-[#e2d4ae]">{phase==='past'?'Completed':phase}</span><span className="rounded-full border border-white/20 bg-black/80 px-2 py-1 text-zinc-300">{evt.published?'Published':'Draft'}</span></div></div>
          <div className="space-y-3 p-4"><div><p className="text-[9px] uppercase tracking-widest text-[#cbb88a]"><SearchHighlight query={search}>{evt.category}</SearchHighlight></p><h3 className="mt-1 truncate text-base font-bold"><SearchHighlight query={search}>{evt.name}</SearchHighlight></h3><p className="mt-1 truncate text-xs text-zinc-400"><SearchHighlight query={search}>{venueName(evt)}</SearchHighlight></p></div>
          <div className="space-y-1 text-xs text-zinc-300"><p className="flex items-center gap-2"><CalendarDays size={12}/>{evt.date?formatDate(`${evt.date.slice(0,10)}T12:00:00`):'Date not recorded'}</p><p className="flex items-center gap-2 text-zinc-400"><Clock size={12}/>{formatTime(evt.start_time)} - {formatTime(evt.end_time)}{evt.end_time.slice(0,5)<=evt.start_time.slice(0,5)?' (+1 day)':''} IST</p></div>
          <div className="grid grid-cols-3 gap-2 border-y border-white/10 py-3">{[['Tickets sold',metric?.sold??'Unavailable'],['Revenue',metric?money(metric.revenue):'Unavailable'],['Check-ins',metric?.checkins??'Unavailable']].map(([label,value])=><div key={label}><p className="text-[9px] uppercase text-zinc-500">{label}</p><p className="mt-1 break-words text-xs font-semibold text-[#e2d4ae]">{value}</p></div>)}</div>
          <div><div className="mb-2 flex justify-between gap-2 text-[10px] text-zinc-400"><span>From {formatINR(evt.ticket_price)}</span><span>{evt.tickets_sold} / {evt.ticket_capacity} sold {capacity===null?'':`(${capacity.toFixed(0)}%)`}</span></div><div className="h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-[#cbb88a]" style={{width:`${Math.max(0,Math.min(100,capacity||0))}%`}}/></div></div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>setViewing(evt)} className="ars-button !px-3 !py-2 !text-[9px]">View</button><button onClick={()=>openForm(evt)} className="ars-button ars-button-secondary !px-3 !py-2 !text-[9px]">Edit</button><button onClick={()=>openForm(evt,true)} className="ars-button ars-button-secondary !px-3 !py-2 !text-[9px]">Duplicate</button><button disabled={Boolean(busy)} onClick={()=>void handleTogglePublish(evt.id,evt.published)} className="ars-button ars-button-secondary !px-3 !py-2 !text-[9px]">{busy===evt.id?'Updating...':evt.published?'Unpublish':'Publish'}</button></div>
        </div></article>;
      })}</div>
      {viewing&&<div onClick={event=>{if(event.target===event.currentTarget)setViewing(null);}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"><section role="dialog" aria-modal="true" aria-label="Event details" className="ars-card max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto p-6"><p className="eyebrow">{eventPhase(viewing,scheduleNow)==='past'?'Completed':eventPhase(viewing,scheduleNow)} / {viewing.published?'Published':'Draft'}</p><h2 className="text-2xl font-bold">{viewing.name}</h2><p className="text-[#e2d4ae]">{venueName(viewing)}</p><p className="text-sm text-zinc-400">{viewing.date.slice(0,10)} / {formatTime(viewing.start_time)} - {formatTime(viewing.end_time)} IST</p><p className="whitespace-pre-wrap text-sm text-zinc-300">{viewing.description}</p><p className="text-xs text-zinc-400">{viewing.category} / Age {viewing.age_limit}+ / From {formatINR(viewing.ticket_price)} / Capacity {viewing.ticket_capacity}</p><button onClick={()=>setViewing(null)} className="ars-button ars-button-secondary">Close</button></section></div>}

      {isModalOpen && (
        <div onClick={event=>{if(event.target===event.currentTarget&&!saving)setIsModalOpen(false);}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-label="Event editor" className="ars-card max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-white">{editing?'Edit event':duplicate?'Duplicate event':'Create nightclub event'}</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs"><fieldset disabled={saving} className="space-y-4">{duplicate&&<p className="text-zinc-400">Choose a new event date. Only event details are copied; sales, tickets and payment history are not.</p>}
              <div>
                <label className="ars-label">Event name</label>
                <input type="text" required placeholder="Saturday Techno Rave" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ars-label">Assigned venue</label>
                  <select required disabled={Boolean(editing)} value={formData.venue_id} onChange={e => setFormData({ ...formData, venue_id: e.target.value })} className="ars-select">
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
                <div><label className="ars-label">Age limit</label><input type="number" required placeholder="21" value={formData.age_limit} onChange={e => setFormData({ ...formData, age_limit: Number(e.target.value) })} className="ars-input" /></div>
              </div>

              <div><label className="ars-label">Cover image URL</label><input type="url" required placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Description</label><textarea rows={3} required placeholder="Event details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ars-textarea" /></div>

              <PassTierEditor value={tiers} onChange={setTiers} disabled={saving}/>
              <label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)} className="accent-[#cbb88a]"/> Published</label>{saveError&&<p role="alert" className="text-red-300">{saveError}</p>}<div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" className="ars-button w-1/2">{saving?'Saving...':editing?'Save changes':published?'Publish event':'Save draft'}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}
    </div>
  );
}
