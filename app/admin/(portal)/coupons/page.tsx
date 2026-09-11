'use client';

import { useEffect, useState } from 'react';
import { getCoupons, saveCoupon } from '@/lib/admin-coupons';
import { getBusinessVenues } from '@/lib/store';
import type { Venue } from '@/lib/types';

type Coupon = { id: string; code: string; discount_type: string; discount_value: number; venue_id: string | null; expires_at: string | null; active: boolean };
export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: 10, venue_id: '', expires_at: '' });
  async function load() {
    try {
      const [rows, clubs] = await Promise.all([getCoupons(), getBusinessVenues()]);
      setCoupons(rows as Coupon[]); setVenues(clubs);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load coupons.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(id?: string, active?: boolean) {
    setBusy(true); setError('');
    try {
      const payload = id ? { active } : { ...form, code: form.code.trim().toUpperCase(), expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : '' };
      const result = await saveCoupon(payload, id);
      if (result.error) { setError(result.error); return; }
      if (!id) setForm({ code: '', discount_type: 'percentage', discount_value: 10, venue_id: '', expires_at: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save coupon.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <div><p className="eyebrow">Customer savings</p><h1 className="mt-3 text-3xl font-black uppercase">Discount coupons</h1><p className="mt-3 text-sm text-zinc-400">Coupons reduce ticket prices. Promoter commissions and processing fees use the discounted ticket subtotal.</p></div>
    {error && <p role="alert" className="ars-card border-red-400 p-4 text-red-300">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="ars-card grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      <label className="ars-label">Coupon code<input required maxLength={80} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="ars-input mt-2" placeholder="NIGHT10" /></label>
      <label className="ars-label">Discount type<select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="ars-select mt-2"><option value="percentage">Percentage</option><option value="fixed">Fixed amount (INR per order)</option></select></label>
      <label className="ars-label">Discount value<input type="number" required min="0.01" max={form.discount_type === 'percentage' ? '99.99' : undefined} step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} className="ars-input mt-2" /></label>
      <label className="ars-label">Venue<select value={form.venue_id} onChange={e => setForm({ ...form, venue_id: e.target.value })} className="ars-select mt-2"><option value="">All venues</option>{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <label className="ars-label">Expiry (optional, local time)<input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="ars-input mt-2" /></label>
      <button disabled={busy || loading} className="ars-button self-end">{busy ? 'Saving...' : 'Create coupon'}</button>
    </form>
    <div className="ars-card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-white/10 text-zinc-400"><tr>{['Code', 'Discount', 'Venue', 'Expires', 'Status', 'Action'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{coupons.map(c => <tr key={c.id} className="border-b border-white/10"><td className="p-4 font-mono text-[#cbb88a]">{c.code}</td><td className="p-4">{c.discount_type === 'percentage' ? c.discount_value + '%' : 'INR ' + c.discount_value}</td><td className="p-4">{c.venue_id ? venues.find(v => v.id === c.venue_id)?.name || 'Unavailable venue' : 'All venues'}</td><td className="p-4">{c.expires_at ? new Date(c.expires_at).toLocaleString() : 'No expiry'}</td><td className="p-4">{!c.active ? 'Disabled' : c.expires_at && new Date(c.expires_at) <= new Date() ? 'Expired' : 'Active'}</td><td className="p-4"><button disabled={busy} className="ars-button ars-button-secondary" onClick={() => void save(c.id, !c.active)}>{c.active ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table>{!coupons.length && <p className="p-6 text-zinc-400">{loading ? 'Loading coupons...' : 'No coupons created yet.'}</p>}</div>
  </div>;
}
