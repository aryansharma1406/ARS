'use client';

import { addVenue,getBusinessVenues as getVenues,updateVenue } from '@/lib/store';
import { Venue } from '@/lib/types';
import { MapPin,Percent,Plus,Power } from 'lucide-react';
import Image from 'next/image';
import React,{ useEffect,useState } from 'react';

export default function AdminVenuesPage() {
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

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    const list = await getVenues();
    setVenues(list);
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

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Venues & Platform Commission</h2>
          <p className="text-xs text-gray-400">Configure partner nightclubs, locations, and commercial split %</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Venue
        </button>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {venues.map((venue) => (
          <div key={venue.id} className="glass-panel p-6 rounded-3xl border border-border space-y-4 relative">
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
                <Image
                  src={venue.image}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    venue.active ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {venue.active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-xs text-accent-purple font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {venue.address}
                </p>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                  {venue.description}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-accent-pink" />
                <span className="text-gray-300 font-semibold">
                  Platform Commission: <strong className="text-accent-pink">{venue.commission_percentage}%</strong>
                </span>
              </div>

              <button
                onClick={() => handleToggleActive(venue.id, venue.active)}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-gray-300 hover:text-white hover:bg-surface flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                {venue.active ? 'Disable Venue' : 'Enable Venue'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Venue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-border space-y-6">
            <h3 className="text-xl font-bold text-white">Add Partner Venue</h3>

            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Club ABC"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Location Region</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Baga, Goa"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Platform Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="20.0"
                    value={formData.commission_percentage}
                    onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Full Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="Tito's Lane, Baga, Goa"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Club Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="High-energy nightclub details..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-xl font-semibold text-gray-400 bg-surface border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-white bg-accent-purple"
                >
                  Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
