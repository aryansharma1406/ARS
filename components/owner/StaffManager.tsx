'use client';
import type { Event, VenueStaffAssignment } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
interface Invitation { id: string; name: string; email: string; phone: string; event_id: string | null; gate_name: string; status: string; assignment_id: string | null; expires_at: string }
export default function StaffManager({ venueId, events, assignments }: { venueId: string; events: Event[]; assignments: VenueStaffAssignment[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const empty = { name: '', email: '', phone: '', event_id: '', gate_name: 'Main Entrance' };
  const [form, setForm] = useState(empty);
  const [revoke, setRevoke] = useState<Invitation | null>(null);
  async function load() {
    const response = await fetch(`/api/owner/staff/invitations?venue=${encodeURIComponent(venueId)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setRows(data.invitations || []);
  }
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setRows([]); setOpen(false); setError('');
    fetch(`/api/owner/staff/invitations?venue=${encodeURIComponent(venueId)}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!cancelled) setRows(data.invitations || []);
    }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId]);
  async function save(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/owner/staff/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, venue_id: venueId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotice(result.message); setOpen(false); setRevoke(null);
      await load(); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update staff.');
      // A delivery failure can leave an invitation saved and ready to resend.
      try { await load(); } catch { /* Keep the original actionable error. */ }
    } finally { setBusy(false); }
  }
  async function toggleLegacy(row: VenueStaffAssignment) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/owner/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, venue_id: venueId, active: !row.active }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update access.'); }
    finally { setBusy(false); }
  }
  const legacy = assignments.filter(item => !rows.some(row => row.assignment_id === item.id));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-sm leading-6 text-zinc-400">Invite your team by email. Staff set their own password and receive scanner access only for this venue.</p><button disabled={busy || loading} className="ars-button" onClick={() => { setForm(empty); setEditId(null); setOpen(!open); }}>Invite staff</button></div>
    {error && <p role="alert" className="border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {open && <form onSubmit={e => { e.preventDefault(); void save({ ...form, id: editId, action: editId ? 'edit' : 'invite' }); }} className="grid gap-5 border border-[#cbb88a]/30 bg-black/30 p-5 sm:grid-cols-2">
      <h3 className="text-lg font-semibold sm:col-span-2">{editId ? 'Edit staff assignment' : 'Invite a team member'}</h3>
      <label><span className="ars-label">Full name</span><input required minLength={2} maxLength={150} className="ars-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label><span className="ars-label">Staff email</span><input type="email" required readOnly={!!editId} maxLength={254} className="ars-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label><span className="ars-label">Phone</span><input type="tel" required minLength={6} maxLength={30} className="ars-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
      <label><span className="ars-label">Event access</span><select className="ars-input" value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })}><option value="">All venue events</option>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
      <label><span className="ars-label">Entry gate</span><input required maxLength={100} className="ars-input" value={form.gate_name} onChange={e => setForm({ ...form, gate_name: e.target.value })} /></label>
      <p className="text-xs leading-6 text-zinc-400">Use a dedicated staff email. Owners and administrators cannot be converted into staff. Invitations expire after 24 hours.</p>
      <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="ars-button">{busy ? 'Saving...' : editId ? 'Save assignment' : 'Send invitation'}</button><button type="button" disabled={busy} className="ars-button ars-button-secondary" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
    {revoke && <div role="region" aria-label="Confirm access revocation" className="border border-amber-400/30 bg-amber-400/5 p-5"><h3 className="font-semibold">Revoke access for {revoke.name}?</h3><p className="my-3 text-sm text-zinc-400">This disables this venue assignment or invitation. Access to other venues is unchanged.</p><div className="flex gap-3"><button disabled={busy} className="ars-button" onClick={() => void save({ id: revoke.id, action: 'disable' })}>Revoke access</button><button disabled={busy} className="ars-button ars-button-secondary" onClick={() => setRevoke(null)}>Cancel</button></div></div>}
    {loading ? <p className="text-zinc-400">Loading staff...</p> : rows.length === 0 && legacy.length === 0 ? <p className="py-8 text-center text-zinc-400">No staff yet. Send your first invitation above.</p> : null}
    <div className="space-y-3">{rows.map(row => <div key={row.id} className="grid gap-4 border border-white/10 p-5 lg:grid-cols-[1fr_1fr_auto]">
      <div><p className="font-semibold text-white">{row.name}</p><p className="mt-1 break-all text-sm text-zinc-400">{row.email}</p><p className="mt-1 text-xs text-zinc-500">{row.phone}</p></div>
      <div><p className="text-sm">{events.find(event => event.id === row.event_id)?.name || 'All venue events'}</p><p className="mt-1 text-xs text-zinc-400">{row.gate_name}</p><p className="mt-2 text-xs font-semibold text-[#cbb88a]">{row.status}{row.status === 'Invited' && new Date(row.expires_at).getTime() < Date.now() ? ' / Expired' : ''}</p></div>
      <div className="flex flex-wrap items-start gap-2"><button disabled={busy} className="ars-button ars-button-secondary !px-3 !py-2 !text-xs" onClick={() => { setForm({ name: row.name, email: row.email, phone: row.phone, gate_name: row.gate_name, event_id: row.event_id || '' }); setEditId(row.id); setOpen(true); }}>Edit</button>{row.status === 'Invited' && <button disabled={busy} className="ars-button ars-button-secondary !px-3 !py-2 !text-xs" onClick={() => void save({ id: row.id, action: 'resend' })}>Resend invitation</button>}{row.status !== 'Disabled' && <button disabled={busy} className="ars-button ars-button-secondary !px-3 !py-2 !text-xs" onClick={() => setRevoke(row)}>Revoke access</button>}</div>
    </div>)}</div>
    {legacy.length > 0 && <div className="space-y-3"><h3 className="text-sm font-semibold">Previously assigned staff</h3>{legacy.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-4"><div><p className="break-all text-xs text-zinc-400">Staff ID: {row.user_id}</p><p className="mt-1 text-sm">{events.find(event => event.id === row.event_id)?.name || 'All venue events'} / {row.gate_name || 'Main Entrance'}</p></div><button disabled={busy} onClick={() => void toggleLegacy(row)} className="ars-button ars-button-secondary">{row.active ? 'Disable' : 'Enable'}</button></div>)}</div>}
  </div>;
}
