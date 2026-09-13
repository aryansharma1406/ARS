'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { updateVenue } from '@/lib/store';
import {getAdminVenueCards} from '@/lib/admin-venue-cards';
import Link from 'next/link';
import { createVenueWithOwner, editAdminVenue } from '@/lib/admin-venues';
import { Venue } from '@/lib/types';
import { MapPin,Plus,Power,Pencil } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import VenuePhotoUpload from '@/components/VenuePhotoUpload';
import VenueModalOverlay from '@/components/VenueModalOverlay';
import React,{ useEffect,useState } from 'react';

export default function AdminVenuesPage() {
  const [loading, setLoading] = useState(true);
  const [metrics,setMetrics]=useState<Awaited<ReturnType<typeof getAdminVenueCards>>['metrics']>([]);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('all');
  const [sort,setSort]=useState('revenue');
  const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(n);
  const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const terms=normalize(search).trim().split(/\s+/).filter(Boolean);
  function highlight(value:string) {
    if(!terms.length)return value;
    const normalized=normalize(value);
    const matches=Array.from(value).map((_,i)=>terms.some(term=>{const start=normalized.lastIndexOf(term,i);return start>=0&&i<start+term.length;}));
    return <>{Array.from(value).map((letter,i)=>matches[i]?<mark key={i} className="bg-[#cbb88a]/25 text-[#e2d4ae]">{letter}</mark>:<React.Fragment key={i}>{letter}</React.Fragment>)}</>;
  }
  const [loadError, setLoadError] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignOwner, setAssignOwner] = useState(true);
  const [owner, setOwner] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto,setUploadingPhoto]=useState(false);
  const [saveError, setSaveError] = useState('');
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<Venue | null>(null);
  const [actionError, setActionError] = useState('');
  const [busyVenue, setBusyVenue] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    description: '',
    image: '',
    commission_percentage: 20.0,
  });

  useEffect(() => { loadVenues(); }, []);

  const loadVenues = async () => {
    setLoadError('');
    try {
    const result = await getAdminVenueCards();
    setVenues(result.venues);
    setMetrics(result.metrics);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploadingPhoto) return;
    setSaving(true);
    setSaveError('');
    try {
    const payload = {
      ...formData,
      commission_percentage: Number(formData.commission_percentage),
      active: editingVenue?.active ?? true,
    };
    const result = editingVenue
      ? await editAdminVenue(editingVenue.id, payload, assignOwner ? owner : null)
      : await createVenueWithOwner(payload, assignOwner ? owner : null);
    if (!result.success) {
      setSaveError(result.error);
      return;
    }
    setIsModalOpen(false);
    setEditingVenue(null);
    setOwner({ name: '', email: '', phone: '' });
    setAssignOwner(true);
    setFormData({
      name: '',
      location: '',
      address: '',
      description: '',
      image: '',
      commission_percentage: 20.0,
    });
    loadVenues();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to create venue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setBusyVenue(id);
    setActionError('');
    try {
      await updateVenue(id, { active: !currentActive });
      await loadVenues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update venue.');
    } finally { setBusyVenue(null); }
  };

  const openVenueForm = (venue: Venue | null) => {
    setEditingVenue(venue);
    setSaveError('');
    setFormData({ name: venue?.name ?? '', location: venue?.location ?? '', address: venue?.address ?? '', description: venue?.description ?? '', image: venue?.image ?? '', commission_percentage: Number(venue?.commission_percentage ?? 20) });
    setOwner({ name: venue?.owner_name ?? '', email: venue?.owner_email ?? '', phone: venue?.owner_phone ?? '' });
    setAssignOwner(!venue || Boolean(venue.owner_email));
    setIsModalOpen(true);
  };

  const handleDeleteVenue = async () => {
    if (!deletingVenue || busyVenue) return;
    setBusyVenue(deletingVenue.id);
    setActionError('');
    try {
      await updateVenue(deletingVenue.id, { active: false });
      setDeletingVenue(null);
      await loadVenues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to disable venue.');
    } finally { setBusyVenue(null); }
  };

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {actionError && !deletingVenue && <p role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-4 text-red-200">{actionError}</p>}
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadVenues()}>Retry loading</button></div> : !venues.length && <EmptyState title="No venues to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">Venues & platform commission</h2>
          <p className="text-xs text-zinc-400">Configure partner nightclubs, locations, and split %.</p>
        </div>
        <button onClick={() => openVenueForm(null)} className="ars-button flex items-center gap-2"><Plus className="w-4 h-4" /> Add new venue</button>
      </div>

      <div className="ars-card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-52 flex-1 text-xs text-zinc-400">Search venues or owners<div className="relative mt-2"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, location, owner or email" className="ars-input !pr-16"/>{search&&<button type="button" onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#e2d4ae]">Clear</button>}</div></label>
        <label className="text-xs text-zinc-400">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="ars-select mt-2"><option value="all">All venues</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
        <label className="text-xs text-zinc-400">Sort by<select value={sort} onChange={e=>setSort(e.target.value)} className="ars-select mt-2"><option value="revenue">Revenue: high to low</option><option value="tickets">Tickets sold</option><option value="growth">Growth</option><option value="name">Name A-Z</option><option value="newest">Newest venues</option></select></label>
      </div>
      <details className="text-xs leading-6 text-zinc-500"><summary className="cursor-pointer text-[#e2d4ae]">About venue metrics</summary><p>Performance uses the last 30 rolling days. Revenue is paid ticket subtotal after discounts, excluding fees; existing test bookings remain included. Growth compares the preceding 30 days. Check-ins are used passes from those bookings. Active events are published upcoming/live events now. Staff counts distinct accounts with active venue assignments, not online scanners. Commission figures use all-time existing settlement reports, including estimates where no saved settlement exists; venue payable includes both pending and settled reports, not only the outstanding balance. Venue type is not recorded in the current schema.</p></details>
      {(() => {
        const rows=venues.filter(v=>(status==='all'||(status==='active'?v.active:!v.active))&&terms.every(term=>normalize([v.name,v.location,v.address,v.owner_name,v.owner_email,v.owner_phone].filter(Boolean).join(' ')).includes(term))).sort((a,b)=>{
          const x=metrics.find(m=>m.id===a.id),y=metrics.find(m=>m.id===b.id);
          if(sort==='name')return a.name.localeCompare(b.name);
          if(sort==='newest')return Date.parse(b.created_at)-Date.parse(a.created_at);
          if(sort==='tickets')return (y?.tickets||0)-(x?.tickets||0);
          if(sort==='growth')return (y?.growth??-Infinity)-(x?.growth??-Infinity);
          return (y?.revenue||0)-(x?.revenue||0);
        });
        return <><p className="text-xs text-zinc-500" role="status">{rows.length} venues / 30-day performance</p><div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{rows.map(venue=>{
          const m=metrics.find(row=>row.id===venue.id);
          return <article key={venue.id} className="ars-card min-w-0 overflow-hidden p-5">
            <div className="flex items-start gap-3"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10"><CatalogImage src={venue.image} alt={venue.name} className="object-cover"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{highlight(venue.name)}</h3><span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-widest ${venue.active?'border-emerald-500/30 text-emerald-300':'border-white/15 text-zinc-400'}`}>{venue.active?'Active':'Disabled'}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-[#e2d4ae]"><MapPin size={12}/>{highlight(venue.location||venue.address||'Location not recorded')}</p><p className="mt-1 text-[11px] text-zinc-500">Type: Not recorded</p></div></div>
            <div className="my-4 grid grid-cols-2 gap-3 border-y border-white/10 py-3 sm:grid-cols-5">{[['Revenue',m?money(m.revenue):'Unavailable'],['Tickets Sold',m?.tickets??'Unavailable'],['Check-ins',m?.checkins??'Unavailable'],['Active Events',m?.activeEvents??'Unavailable'],['Growth',m?.growth==null?'No baseline':`${m.growth>=0?'+':''}${m.growth.toFixed(1)}%`]].map(([label,value])=><div key={label}><p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 break-words text-sm font-semibold tabular-nums text-[#e2d4ae]">{value}</p></div>)}</div>
            <div className="flex items-start justify-between gap-4 text-xs"><div className="min-w-0"><p className="text-[9px] uppercase tracking-widest text-zinc-500">Venue owner</p><p className="mt-1 font-medium">{highlight(venue.owner_name||'Owner not recorded')}</p><p className="mt-1 break-all text-zinc-400">{highlight(venue.owner_email||'Email not recorded')}</p><p className="mt-1 text-zinc-400">{highlight(venue.owner_phone||'Phone not recorded')}</p></div><div className="shrink-0 text-right"><p className="text-[9px] uppercase tracking-widest text-zinc-500">Assigned staff</p><p className="mt-1 text-lg text-[#e2d4ae]">{m?.staff??'Unavailable'}</p></div></div>
            <div className="my-4 rounded-lg border border-[#cbb88a]/20 bg-[#cbb88a]/[.045] p-3"><div className="grid grid-cols-3 gap-3">{[['Commission',`${venue.commission_percentage}%`],['ARS earnings',m?money(m.earnings):'Unavailable'],['Venue payable',m?money(m.payable):'Unavailable']].map(([label,value])=><div key={label}><p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 break-words text-xs font-semibold text-[#e2d4ae]">{value}</p></div>)}</div><p className="mt-2 text-[10px] text-zinc-500">All-time settlement reports{m?.estimated?' / includes estimates':' / recorded amounts'}</p></div>
            <div className="flex flex-wrap gap-2"><Link href={`/admin/performance/${venue.id}?days=30`} className="ars-button !px-4 !py-2 !text-[10px]">View Analytics</Link><button disabled={busyVenue===venue.id} onClick={()=>openVenueForm(venue)} className="ars-button ars-button-secondary !px-3 !py-2 !text-[10px]"><Pencil size={12}/> Edit</button><button disabled={Boolean(busyVenue)} onClick={()=>{if(venue.active){setActionError('');setDeletingVenue(venue);}else void handleToggleActive(venue.id,false);}} className="ars-button ars-button-secondary !px-3 !py-2 !text-[10px]"><Power size={12}/>{venue.active?'Disable':'Enable'}</button></div>
          </article>;
        })}</div>{!rows.length&&venues.length>0&&<EmptyState title="No matching venues" copy="Try another search or change the status filter."/>}</>;
      })()}

      {isModalOpen && (
        <VenueModalOverlay onClose={()=>{if(!saving&&!uploadingPhoto)setIsModalOpen(false);}}>
          <div role="dialog" aria-modal="true" aria-label={editingVenue ? 'Edit venue details' : 'Add partner venue'} className="ars-card max-h-[90dvh] overflow-y-auto max-w-lg w-full p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-black text-white">{editingVenue ? 'Edit venue details' : 'Add partner venue'}</h3>
            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div><label className="ars-label">Venue name</label><input type="text" required placeholder="Club ABC" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="ars-label">Location region</label><input type="text" required placeholder="Baga, Goa" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="ars-input" /></div>
                <div><label className="ars-label">Platform commission %</label><input type="number" step="0.1" required placeholder="20.0" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} className="ars-input" /></div>
              </div>
              <div><label className="ars-label">Full street address</label><input type="text" required placeholder="Tito's Lane, Baga" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="ars-input" /></div>
              <VenuePhotoUpload value={formData.image} onChange={image=>setFormData(prev=>({...prev,image}))} onBusyChange={setUploadingPhoto}/>
              <div><label className="ars-label">Club description</label><textarea rows={3} required placeholder="High-energy nightclub details" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ars-textarea" /></div>
              <fieldset className="space-y-4 border-t border-white/10 pt-5" disabled={saving || uploadingPhoto}>
                <legend className="px-1 text-sm font-bold text-white">Owner</legend>
                <label className="flex items-center gap-3 text-zinc-300">
                  <input type="checkbox" checked={assignOwner} disabled={Boolean(editingVenue && !editingVenue.owner_email)} onChange={e => setAssignOwner(e.target.checked)} className="accent-[#cbb88a]" />
                  {editingVenue ? 'Edit owner contact for this venue' : 'Assign this venue to an owner account'}
                </label>
                {assignOwner && <>
                  <p className="text-xs leading-5 text-zinc-400">{editingVenue ? 'Name and phone apply only to this venue. The assigned login email stays the same. Uncheck to leave the owner contact unchanged.' : 'Enter an existing confirmed account email. Name and phone are saved for this venue only. Owners use their existing password at /owner and retain access to their other assigned venues.'}</p>
                  <div><label htmlFor="owner-name" className="ars-label">Owner name</label><input id="owner-name" type="text" required maxLength={120} autoComplete="name" value={owner.name} onChange={e => setOwner({ ...owner, name: e.target.value })} className="ars-input" /></div>
                  <div><label htmlFor="owner-email" className="ars-label">Owner email</label><input id="owner-email" type="email" readOnly={Boolean(editingVenue)} required maxLength={254} autoComplete="email" value={owner.email} onChange={e => setOwner({ ...owner, email: e.target.value })} className="ars-input" /></div>
                  <div><label htmlFor="owner-phone" className="ars-label">Owner phone</label><input id="owner-phone" type="tel" required minLength={5} maxLength={30} autoComplete="tel" value={owner.phone} onChange={e => setOwner({ ...owner, phone: e.target.value })} className="ars-input" /></div>
                </>}
              </fieldset>
              {saveError && <p role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-4 text-red-200">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={saving || uploadingPhoto} onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" disabled={saving || uploadingPhoto} className="ars-button w-1/2">{saving ? 'Saving...' : 'Save venue'}</button>
              </div>
            </form>
          </div>
        </VenueModalOverlay>
      )}
      {deletingVenue && <div onClick={event=>{if(event.target===event.currentTarget&&!busyVenue)setDeletingVenue(null);}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-venue-title" aria-describedby="delete-venue-description" className="ars-card w-full max-w-lg space-y-5 p-6 sm:p-8">
          <h3 id="delete-venue-title" className="text-xl font-bold text-white">Disable {deletingVenue.name}?</h3>
          <p id="delete-venue-description" className="text-sm leading-6 text-zinc-400">This disables the venue using its existing active status. Historical tickets, payments, settlements and audit records are retained. You can find it under Disabled and enable it again. Other venues on the same owner account are unaffected.</p>
          {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
          <div className="flex flex-wrap gap-3">
            <button disabled={Boolean(busyVenue)} onClick={() => setDeletingVenue(null)} className="ars-button ars-button-secondary">Cancel</button>
            <button disabled={Boolean(busyVenue)} onClick={() => void handleDeleteVenue()} className="ars-button">{busyVenue ? 'Disabling...' : 'Disable venue'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
