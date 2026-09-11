'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { getBusinessVenues as getVenues,updateVenue } from '@/lib/store';
import { createVenueWithOwner, deleteAdminVenue, editAdminVenue } from '@/lib/admin-venues';
import { Venue } from '@/lib/types';
import { MapPin,Percent,Plus,Power,Pencil,Trash2 } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import React,{ useEffect,useState } from 'react';

export default function AdminVenuesPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignOwner, setAssignOwner] = useState(true);
  const [owner, setOwner] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
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
    const list = await getVenues();
    setVenues(list);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
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
      await deleteAdminVenue(deletingVenue.id);
      setDeletingVenue(null);
      await loadVenues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete venue.');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {venues.map((venue) => (
          <article key={venue.id} className="ars-card space-y-4 p-6">
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                <CatalogImage src={venue.image} alt={venue.name} className="object-cover" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <h3 className="text-lg font-black text-white">{venue.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${venue.active ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{venue.active ? 'ACTIVE' : 'DISABLED'}</span>
                </div>
                <p className="text-xs text-accent-purple font-semibold flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {venue.address}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{venue.description}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4 items-center justify-between text-xs">
              <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-accent-pink" /> <span className="text-zinc-300 font-black">Platform commission: <strong className="text-accent-pink">{venue.commission_percentage}%</strong></span></div>
              <button disabled={busyVenue === venue.id} onClick={() => handleToggleActive(venue.id, venue.active)} className="ars-button ars-button-secondary flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> {venue.active ? 'Disable venue' : 'Enable venue'}</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button disabled={busyVenue === venue.id} onClick={() => openVenueForm(venue)} className="ars-button ars-button-secondary"><Pencil size={14}/> Edit details</button>
              <button disabled={busyVenue === venue.id} onClick={() => { setActionError(''); setDeletingVenue(venue); }} className="ars-button ars-button-secondary !text-red-300"><Trash2 size={14}/> Delete venue</button>
            </div>
          </article>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-label={editingVenue ? 'Edit venue details' : 'Add partner venue'} className="ars-card max-h-[90dvh] overflow-y-auto max-w-lg w-full p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-black text-white">{editingVenue ? 'Edit venue details' : 'Add partner venue'}</h3>
            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div><label className="ars-label">Venue name</label><input type="text" required placeholder="Club ABC" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="ars-label">Location region</label><input type="text" required placeholder="Baga, Goa" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="ars-input" /></div>
                <div><label className="ars-label">Platform commission %</label><input type="number" step="0.1" required placeholder="20.0" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} className="ars-input" /></div>
              </div>
              <div><label className="ars-label">Full street address</label><input type="text" required placeholder="Tito's Lane, Baga" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Cover image URL</label><input type="url" required placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Club description</label><textarea rows={3} required placeholder="High-energy nightclub details" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ars-textarea" /></div>
              <fieldset className="space-y-4 border-t border-white/10 pt-5" disabled={saving}>
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
                <button type="button" disabled={saving} onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" disabled={saving} className="ars-button w-1/2">{saving ? 'Saving...' : 'Save venue'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deletingVenue && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-venue-title" aria-describedby="delete-venue-description" className="ars-card w-full max-w-lg space-y-5 p-6 sm:p-8">
          <h3 id="delete-venue-title" className="text-xl font-bold text-white">Delete {deletingVenue.name}?</h3>
          <p id="delete-venue-description" className="text-sm leading-6 text-zinc-400">This removes the venue from this list and stops public booking and owner/staff access. Ticket, payment and audit history will be retained. Other venues on the same owner account are unaffected.</p>
          {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
          <div className="flex flex-wrap gap-3">
            <button disabled={Boolean(busyVenue)} onClick={() => setDeletingVenue(null)} className="ars-button ars-button-secondary">Cancel</button>
            <button disabled={Boolean(busyVenue)} onClick={() => void handleDeleteVenue()} className="ars-button !bg-red-400 !text-black">{busyVenue ? 'Deleting...' : 'Delete venue'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
