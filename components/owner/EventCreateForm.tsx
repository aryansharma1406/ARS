'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Event } from '@/lib/types';

type EventFormMode = 'create' | 'edit';

type FormState = {
  venue_id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  ticket_capacity: number;
  age_limit: number;
  published: boolean;
};

export default function EventCreateForm({
  venueId,
  mode = 'create',
  event,
  onSaved,
}: {
  venueId: string;
  mode?: EventFormMode;
  event?: Partial<Event>;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const defaults = useMemo(
    () => ({
      venue_id: venueId,
      name: event?.name || '',
      description: event?.description || '',
      image: event?.image || '',
      category: event?.category || 'Techno / House',
      date: event?.date || '',
      start_time: event?.start_time || '21:00',
      end_time: event?.end_time || '03:00',
      ticket_price: event?.ticket_price || 999,
      ticket_capacity: event?.ticket_capacity || 200,
      age_limit: event?.age_limit || 21,
      published: event?.published || false,
    }),
    [venueId, event],
  );

  const [form, setForm] = useState<FormState>(defaults);
  const isEdit = mode === 'edit';

  async function save() {
    setBusy(true);
    setError('');

    const payload: FormState = {
      ...form,
      venue_id: venueId,
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      category: form.category.trim() || 'Techno / House',
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      ticket_price: Number(form.ticket_price),
      ticket_capacity: Number(form.ticket_capacity),
      age_limit: Number(form.age_limit),
      published: form.published,
    };

    if (!payload.name) {
      setError('Event name is required.');
      setBusy(false);
      return;
    }
    if (!payload.description) {
      setError('Event description is required.');
      setBusy(false);
      return;
    }
    if (!payload.image) {
      setError('Event image URL is required.');
      setBusy(false);
      return;
    }
    if (!payload.ticket_price || payload.ticket_price <= 0) {
      setError('Ticket price must be greater than zero.');
      setBusy(false);
      return;
    }
    if (!payload.ticket_capacity || payload.ticket_capacity < 1) {
      setError('Ticket capacity must be at least one.');
      setBusy(false);
      return;
    }
    if (!payload.age_limit || payload.age_limit < 18) {
      setError('Age limit must be 18 or above.');
      setBusy(false);
      return;
    }
    if (!payload.date) {
      setError('Event date is required.');
      setBusy(false);
      return;
    }

    const response = await fetch('/api/owner/events', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isEdit
          ? {
              id: event?.id,
              ...payload,
            }
          : payload,
      ),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to save event.');
      setBusy(false);
      return;
    }

    setOpen(false);
    setBusy(false);
    setForm(defaults);
    onSaved?.();
    router.refresh();
  }

  const input = 'w-full border border-white/15 bg-black px-3 py-2.5 text-sm text-white';

  return (
    <>
      {isEdit ? (
        <button onClick={() => setOpen(true)} className="ars-button">Edit event</button>
      ) : (
        <button onClick={() => setOpen(true)} className="ars-button">Create event</button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-3xl border border-white/15 bg-[#0b0b0b] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">{isEdit ? 'Update event' : 'New event'}</p>
                <h2 className="mt-2 text-3xl font-black uppercase">{isEdit ? 'Edit venue event' : 'Create a new event'}</h2>
              </div>
              <button aria-label="Close" onClick={() => setOpen(false)}><X /></button>
            </div>

            <div className="mt-8 space-y-8">
              <section>
                <h3 className="mb-4 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Basic information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-zinc-400">Event name<input required className={`${input} mt-2`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400 sm:col-span-2">Description<textarea required className={`${input} mt-2 min-h-24`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">Image URL<input type="url" required className={`${input} mt-2`} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">Genre<input required className={`${input} mt-2`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">Age limit<input type="number" min="18" className={`${input} mt-2`} value={form.age_limit} onChange={(e) => setForm({ ...form, age_limit: Number(e.target.value) })} /></label>
                </div>
              </section>

              <section>
                <h3 className="mb-4 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Date, time and pricing</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-xs text-zinc-400">Date<input type="date" required className={`${input} mt-2`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">Start<input type="time" required className={`${input} mt-2`} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">End<input type="time" required className={`${input} mt-2`} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
                  <label className="text-xs text-zinc-400">Ticket price ₹<input type="number" min="1" className={`${input} mt-2`} value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: Number(e.target.value) })} /></label>
                  <label className="text-xs text-zinc-400">Capacity<input type="number" min="1" className={`${input} mt-2`} value={form.ticket_capacity} onChange={(e) => setForm({ ...form, ticket_capacity: Number(e.target.value) })} /></label>
                </div>
              </section>

              <section>
                <h3 className="mb-4 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Publish state</h3>
                <label className="text-xs text-zinc-400">
                  <select className={input + ' mt-2'} value={String(form.published)} onChange={(e) => setForm({ ...form, published: e.target.value === 'true' })}>
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </label>
              </section>

              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {!isEdit && <button disabled={busy} onClick={() => void save()} className="ars-button ars-button-secondary">Save draft</button>}
                <button disabled={busy} onClick={() => void save()} className="ars-button">{isEdit ? 'Save changes' : 'Publish event'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
