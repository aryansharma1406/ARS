'use client';

import React, { useState, useEffect } from 'react';
import { Event, Venue } from '@/lib/types';
import { getEvents, getVenues, addEvent, updateEvent } from '@/lib/store';
import { formatINR, formatDate } from '@/lib/utils';
import { Calendar, Plus, Edit3, Eye, EyeOff, MapPin, Ticket } from 'lucide-react';
import Image from 'next/image';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const evts = await getEvents();
    const vns = await getVenues();
    setEvents(evts);
    setVenues(vns);
    if (vns.length > 0 && !formData.venue_id) {
      setFormData(prev => ({ ...prev, venue_id: vns[0].id }));
    }
  };

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

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Events & Ticket Pricing</h2>
          <p className="text-xs text-gray-400">Create, edit, and publish nightclub lineups</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* Events Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((evt) => (
          <div key={evt.id} className="glass-panel rounded-3xl border border-border overflow-hidden flex flex-col justify-between">
            <div className="relative h-44 w-full">
              <Image
                src={evt.image}
                alt={evt.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              
              <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-accent-cyan border border-border">
                {evt.category}
              </div>

              <div className="absolute top-3 right-3">
                <button
                  onClick={() => handleTogglePublish(evt.id, evt.published)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md ${
                    evt.published ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40' : 'bg-gray-900/90 text-gray-400'
                  }`}
                >
                  {evt.published ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                  {evt.published ? 'PUBLISHED' : 'DRAFT'}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white line-clamp-1">{evt.name}</h3>
                <p className="text-xs text-accent-purple font-medium mt-0.5">
                  {evt.venue_name || "Club Xtreme, Tito's Lane"}
                </p>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                  {evt.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-surface border border-border/50">
                <div>
                  <span className="text-gray-400 block text-[10px]">Entry Price</span>
                  <strong className="text-white text-sm">{formatINR(evt.ticket_price)}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Capacity Sold</span>
                  <strong className="text-accent-pink text-sm">{evt.tickets_sold} / {evt.ticket_capacity}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-border space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white">Create Nightclub Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saturday Techno Rave"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Assigned Venue</label>
                  <select
                    value={formData.venue_id}
                    onChange={e => setFormData({ ...formData, venue_id: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Genre Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Melodic Techno / EDM"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Ticket Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="1499"
                    value={formData.ticket_price}
                    onChange={e => setFormData({ ...formData, ticket_price: Number(e.target.value) })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    placeholder="400"
                    value={formData.ticket_capacity}
                    onChange={e => setFormData({ ...formData, ticket_capacity: Number(e.target.value) })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Age Limit</label>
                  <input
                    type="number"
                    required
                    placeholder="21"
                    value={formData.age_limit}
                    onChange={e => setFormData({ ...formData, age_limit: Number(e.target.value) })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
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
                <label className="block font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Event details..."
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
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
