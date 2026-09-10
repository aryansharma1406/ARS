'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { addVenue,getBusinessVenues as getVenues,updateVenue } from '@/lib/store';
import { Venue } from '@/lib/types';
import { MapPin,Percent,Plus,Power } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import React,{ useEffect,useState } from 'react';

export default function AdminVenuesPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    await addVenue({
      ...formData,
      commission_percentage: Number(formData.commission_percentage),
      active: true,
    });
    setIsModalOpen(false);
    setFormData({
      name: '',
      location: '',
      address: '',
      description: '',
      image: '',
      commission_percentage: 20.0,
    });
    loadVenues();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateVenue(id, { active: !currentActive });
    loadVenues();
  };

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadVenues()}>Retry loading</button></div> : !venues.length && <EmptyState title="No venues to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">Venues & platform commission</h2>
          <p className="text-xs text-zinc-400">Configure partner nightclubs, locations, and split %.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="ars-button flex items-center gap-2"><Plus className="w-4 h-4" /> Add new venue</button>
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
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-accent-pink" /> <span className="text-zinc-300 font-black">Platform commission: <strong className="text-accent-pink">{venue.commission_percentage}%</strong></span></div>
              <button onClick={() => handleToggleActive(venue.id, venue.active)} className="ars-button ars-button-secondary flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> {venue.active ? 'Disable venue' : 'Enable venue'}</button>
            </div>
          </article>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="ars-card max-w-lg w-full p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-black text-white">Add partner venue</h3>
            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div><label className="ars-label">Venue name</label><input type="text" required placeholder="Club ABC" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="ars-label">Location region</label><input type="text" required placeholder="Baga, Goa" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="ars-input" /></div>
                <div><label className="ars-label">Platform commission %</label><input type="number" step="0.1" required placeholder="20.0" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} className="ars-input" /></div>
              </div>
              <div><label className="ars-label">Full street address</label><input type="text" required placeholder="Tito's Lane, Baga" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Cover image URL</label><input type="url" required placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Club description</label><textarea rows={3} required placeholder="High-energy nightclub details" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ars-textarea" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" className="ars-button w-1/2">Save venue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
