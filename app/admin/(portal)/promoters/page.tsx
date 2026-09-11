'use client';

import { LiveSearchInput, SearchHighlight } from '@/components/LiveSearch';
import { matchesSearch } from '@/lib/search';


import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, Copy, Download, Plus, QrCode, Search, X } from 'lucide-react';
import { getPromoterDirectory, getPromoterActivity, savePromoter, type PromoterRecord } from '@/lib/promoter-management';
import type { Event, Venue } from '@/lib/types';
import { downloadCSV } from '@/lib/utils';
import DisablePromoterDialog from '@/components/DisablePromoterDialog';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n));
const conversion = (p: PromoterRecord) => Number(p.visits) ? (100 * Number(p.converted_visits) / Number(p.visits)).toFixed(1) + '%' : 'Not tracked yet';
const blank = { name: '', email: '', phone: '', code: '', venue_id: '', commission_percentage: 20, event_ids: [] as string[] };
type Panel = 'details' | 'sales' | 'commission' | 'qr';

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<PromoterRecord[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [disableTarget, setDisableTarget] = useState<PromoterRecord | null>(null);
  const [disableError, setDisableError] = useState('');
  const [origin, setOrigin] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState<PromoterRecord | null>(null);
  const [panel, setPanel] = useState<Panel>('details');
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getPromoterActivity>> | null>(null);
  const [activityError, setActivityError] = useState('');
  const requestId = useRef(0);
  const qr = useRef<HTMLDivElement>(null);
  const referral = (p: PromoterRecord) => origin + '/r/' + encodeURIComponent(p.code);

  async function load() {
    try {
      const data = await getPromoterDirectory();
      setPromoters(data.promoters); setVenues(data.venues); setEvents(data.events);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load promoters.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { setOrigin(window.location.origin); void load(); }, []);

  async function copy(p: PromoterRecord) {
    try { await navigator.clipboard.writeText(referral(p)); setNotice('Referral link copied.'); }
    catch { setNotice('Copy this link: ' + referral(p)); }
  }
  function exportReport(rows: PromoterRecord[]) {
    downloadCSV('ARS_Promoter_Report.csv', rows.map(p => {
      const row = { ID: p.id, Name: p.name, Email: p.email || '', Phone: p.phone || '', Status: p.active ? 'Active' : 'Disabled', Code: p.code, Link: referral(p), Venue: p.venue_name, Events: p.event_ids.length ? events.filter(e => p.event_ids.includes(e.id)).map(e => e.name).join('; ') : 'All venue events', 'Commission %': p.commission_percentage, 'Tickets sold': p.tickets_sold, 'Discounted revenue': p.revenue, Entries: p.entries, Visits: p.visits, Conversion: conversion(p), Earned: p.earned, 'Recorded paid': p.paid, Pending: Math.max(0, Number(p.earned) - Number(p.paid)) };
      return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" + value : value]));
    }));
  }
  function edit(p?: PromoterRecord) {
    setError(''); setEditor(p ? { id: p.id } : {});
    setForm(p ? { name: p.name, email: p.email || '', phone: p.phone || '', code: p.code, venue_id: p.venue_id, commission_percentage: Number(p.commission_percentage), event_ids: [...p.event_ids] } : { ...blank, venue_id: venues[0]?.id || '' });
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const result = await savePromoter(form, editor?.id);
      if (result.error) { setError(result.error); return; }
      setEditor(null); setNotice('Promoter saved.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save promoter.'); }
    finally { setBusy(false); }
  }
  async function toggle(p: PromoterRecord, confirmed = false) {
    if (busy) return;
    if (p.active && !confirmed) { setDisableError(''); setDisableTarget(p); return; }
    setBusy(true); setError('');
    setDisableError('');
    try {
      const result = await savePromoter({ active: !p.active }, p.id);
      if (result.error) { if (confirmed) setDisableError(result.error); else setError(result.error); return; }
      setDisableTarget(null);
      setNotice(p.active ? 'Promoter disabled successfully.' : 'Promoter enabled successfully.');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to change status.';
      if (confirmed) setDisableError(message); else setError(message);
    }
    finally { setBusy(false); }
  }
  async function view(p: PromoterRecord, tab: Panel) {
    const token = ++requestId.current;
    setSelected(p); setPanel(tab); setActivity(null); setActivityError('');
    if (tab !== 'sales' && tab !== 'commission') return;
    try { const data = await getPromoterActivity(p.id); if (token === requestId.current) setActivity(data); }
    catch (e) { if (token === requestId.current) setActivityError(e instanceof Error ? e.message : 'Unable to load activity.'); }
  }
  function downloadQR() {
    const svg = qr.current?.querySelector('svg');
    if (!svg || !selected) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ARS-' + selected.code.replace(/[^a-z0-9_-]/gi, '_') + '-QR.svg'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = promoters.filter(p => (status === 'all' || p.active === (status === 'active')) && matchesSearch(search, [p.name, p.email, p.phone, p.code, p.id, p.venue_name, ...p.event_ids.map(id => events.find(event => event.id === id)?.name)]));
  const total = (field: 'revenue' | 'earned' | 'paid') => promoters.reduce((sum, p) => sum + Number(p[field]), 0);
  const actionClass = 'rounded-sm border border-white/15 px-3 py-2 text-[11px] font-semibold text-zinc-300 transition hover:border-[#cbb88a] hover:text-[#cbb88a] disabled:opacity-40';

  return <div className="space-y-6">
    {disableTarget && <DisablePromoterDialog name={disableTarget.name} code={disableTarget.code} busy={busy} error={disableError} onCancel={() => setDisableTarget(null)} onConfirm={() => void toggle(disableTarget, true)}/>}
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Partner network</p><h1 className="mt-3 text-3xl font-black uppercase">Promoters & referrals</h1><p className="mt-3 max-w-2xl text-sm text-zinc-400">One link per promoter code. Commission applies to paid, discounted ticket revenue, excluding processing fees.</p></div><div className="flex gap-3"><button disabled={loading} className="ars-button ars-button-secondary" onClick={() => exportReport(filtered)}><Download size={15}/> Export report</button><button disabled={loading} className="ars-button" onClick={() => edit()}><Plus size={15}/> Add promoter</button></div></div>
    {error && !editor && <div role="alert" className="ars-card border-red-400/40 p-4 text-red-300">{error}<button className={actionClass + ' ml-4'} onClick={() => { setError(''); void load(); }}>Retry</button></div>}
    {notice && <p role="status" className="break-all text-sm text-[#cbb88a]">{notice}</p>}
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[['Active promoters', promoters.filter(p => p.active).length], ['Discounted ticket revenue', money(total('revenue'))], ['Commission earned', money(total('earned'))], ['Pending commission', money(promoters.reduce((sum,p) => sum + Math.max(0,Number(p.earned)-Number(p.paid)),0))]].map(([label,value]) => <div key={String(label)} className="ars-card p-5"><p className="text-xs text-zinc-500">{label}</p><p className="mt-3 text-2xl font-bold text-[#e5d8b7]">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-3"><LiveSearchInput value={search} onChange={setSearch} placeholder="Search name, email, code, venue or event" className="flex-1"/><select aria-label="Filter promoter status" className="ars-select !w-auto" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div>
    <div className="ars-card overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-xs"><thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500"><tr>{['Promoter', 'Referral', 'Assignments', 'Performance', 'Commission', 'Actions'].map(h => <th key={h} className="p-5">{h}</th>)}</tr></thead><tbody>{filtered.map(p => <tr key={p.id} className="border-b border-white/10 align-top hover:bg-white/[.02]">
      <td className="max-w-[240px] space-y-2 p-5"><p className="text-sm font-bold text-white"><SearchHighlight query={search}>{p.name}</SearchHighlight></p><p className="break-all text-zinc-400"><SearchHighlight query={search}>{p.email || 'Email not added'}</SearchHighlight></p><p className="text-zinc-400"><SearchHighlight query={search}>{p.phone || 'Phone not added'}</SearchHighlight></p><p className="break-all font-mono text-[10px] text-zinc-500">ID: <SearchHighlight query={search}>{p.id}</SearchHighlight></p><span className={'inline-block rounded-full px-2 py-1 text-[10px] ' + (p.active ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400')}>{p.active ? 'Active' : 'Disabled'}</span></td>
      <td className="max-w-[250px] space-y-3 p-5"><p className="font-mono text-[#cbb88a]"><SearchHighlight query={search}>{p.code}</SearchHighlight></p><a href={referral(p)} target="_blank" rel="noreferrer" className="block break-all text-[11px] text-zinc-400"><SearchHighlight query={search}>{referral(p)}</SearchHighlight> <ArrowUpRight size={12} className="inline"/></a><div className="flex gap-2"><button aria-label={'Copy referral link for ' + p.name} className={actionClass} onClick={() => void copy(p)}><Copy size={13} className="mr-1 inline"/> Copy link</button><button className={actionClass} onClick={() => void view(p,'qr')}><QrCode size={13} className="mr-1 inline"/> QR</button></div></td>
      <td className="max-w-[200px] p-5"><p className="font-semibold"><SearchHighlight query={search}>{p.venue_name}</SearchHighlight></p><p className="mt-2 text-zinc-400"><SearchHighlight query={search}>{p.event_ids.length ? p.event_ids.map(id => events.find(e => e.id === id)?.name || 'Unavailable event').join(', ') : 'All venue events'}</SearchHighlight></p></td>
      <td className="space-y-2 whitespace-nowrap p-5"><p>{p.tickets_sold} tickets sold</p><p>{money(p.revenue)} revenue</p><p>{p.entries} entries</p><p className="text-zinc-400">{p.visits} tracked visits</p><p className="text-[#cbb88a]">{conversion(p)} conversion</p></td>
      <td className="space-y-2 whitespace-nowrap p-5"><p className="font-bold">{p.commission_percentage}% current rate</p><p>Earned: {money(p.earned)}</p><p>Paid: {money(p.paid)}</p><p className="text-[#cbb88a]">Pending: {money(Math.max(0,Number(p.earned)-Number(p.paid)))}</p></td>
      <td className="w-[250px] p-5"><div className="flex flex-wrap gap-2"><button className={actionClass} onClick={() => void view(p,'details')}>View Details</button><button className={actionClass} onClick={() => edit(p)}>Edit</button><button disabled={busy} className={actionClass} onClick={() => void toggle(p)}>{p.active ? 'Disable' : 'Enable'}</button><button className={actionClass} onClick={() => void view(p,'sales')}>View Sales</button><button className={actionClass} onClick={() => void view(p,'commission')}>View Commission</button><button className={actionClass} onClick={() => exportReport([p])}>Export Report</button></div></td>
    </tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-zinc-400">{loading ? 'Loading promoters...' : 'No promoters match this view.'}</p>}</div>
    <p className="text-xs leading-5 text-zinc-500">Conversion = tracked referral visits with a paid booking / tracked visits. Tracking starts with this update. Paid commission reflects recorded payouts, not automatic bank transfers.</p>

    {editor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"><div role="dialog" aria-modal="true" aria-label="Promoter details" className="ars-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-6"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{editor.id ? 'Edit promoter' : 'Add promoter'}</h2><button disabled={busy} aria-label="Close editor" onClick={() => setEditor(null)}><X/></button></div><form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><label className="ars-label">Name<input required maxLength={150} className="ars-input mt-2" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label className="ars-label">Email<input type="email" maxLength={254} className="ars-input mt-2" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label><label className="ars-label">Phone<input type="tel" maxLength={30} className="ars-input mt-2" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}/></label><label className="ars-label">Referral code<input required readOnly={Boolean(editor.id)} maxLength={80} className="ars-input mt-2 uppercase" value={form.code} onChange={e => setForm({...form,code:e.target.value})}/></label><label className="ars-label">Assigned venue<select required disabled={Boolean(editor.id)} className="ars-select mt-2" value={form.venue_id} onChange={e => setForm({...form,venue_id:e.target.value,event_ids:[]})}><option value="">Choose venue</option>{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label className="ars-label">Commission %<input required type="number" min={0} max={100} step="0.01" className="ars-input mt-2" value={form.commission_percentage} onChange={e => setForm({...form,commission_percentage:Number(e.target.value)})}/></label></div><fieldset className="space-y-3 border-t border-white/10 pt-4"><legend className="text-sm font-semibold">Assigned events</legend><p className="text-xs text-zinc-400">Leave all unchecked to include all current and future events at this venue.</p>{events.filter(e => e.venue_id===form.venue_id).map(e => <label key={e.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.event_ids.includes(e.id)} onChange={change => setForm({...form,event_ids:change.target.checked?[...form.event_ids,e.id]:form.event_ids.filter(id=>id!==e.id)})}/>{e.name}</label>)}</fieldset>{editor.id && <p className="text-xs text-zinc-400">ID: {editor.id}. Code and venue stay fixed to protect attribution history. Commission changes apply to new reservations.</p>}<button disabled={busy} className="ars-button">{busy?'Saving...':'Save promoter'}</button></form></div></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"><div role="dialog" aria-modal="true" aria-label={selected.name+' '+panel} className="ars-card max-h-[90dvh] w-full max-w-3xl overflow-y-auto p-6"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="eyebrow">{panel}</p><h2 className="mt-2 text-2xl font-bold">{selected.name}</h2></div><button aria-label="Close details" onClick={() => { requestId.current++; setSelected(null); }}><X/></button></div>
      {panel==='qr' && <div className="space-y-5"><div ref={qr} className="mx-auto w-fit bg-white p-5"><QRCodeSVG value={referral(selected)} size={240} level="M" marginSize={4}/></div><p className="break-all text-center text-xs text-zinc-400">{referral(selected)}</p><button className="ars-button mx-auto" onClick={downloadQR}><Download size={16}/> Download QR (SVG)</button></div>}
      {panel==='details' && <dl className="grid gap-4 sm:grid-cols-2">{[['Promoter ID',selected.id],['Email',selected.email||'Not added'],['Phone',selected.phone||'Not added'],['Status',selected.active?'Active':'Disabled'],['Referral code',selected.code],['Referral link',referral(selected)],['Venue',selected.venue_name],['Assigned events',selected.event_ids.length?selected.event_ids.map(id=>events.find(e=>e.id===id)?.name||id).join(', '):'All venue events'],['Current commission',selected.commission_percentage+'%'],['Conversion',conversion(selected)]].map(([label,value])=><div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-2 break-all text-sm">{value}</dd></div>)}</dl>}
      {activityError && <p role="alert" className="text-red-300">{activityError}</p>}
      {(panel==='sales'||panel==='commission') && !activity && !activityError && <p>Loading records...</p>}
      {panel==='sales' && activity && <div className="overflow-x-auto"><p className="mb-4 text-xs text-zinc-500">Latest 200 orders. Revenue includes paid orders only.</p><table className="w-full text-left text-xs"><thead><tr>{['Order','Date','Tickets','Discounted subtotal','Status'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{activity.sales.map(o=><tr key={o.id} className="border-t border-white/10"><td className="p-3 font-mono">{o.id}</td><td className="p-3">{new Date(o.created_at).toLocaleString()}</td><td className="p-3">{o.quantity}</td><td className="p-3">{money(o.subtotal)}</td><td className="p-3">{o.payment_status}</td></tr>)}</tbody></table>{!activity.sales.length&&<p className="p-4">No sales yet.</p>}</div>}
      {panel==='commission' && <div className="space-y-5"><div className="grid grid-cols-3 gap-3">{[['Earned',selected.earned],['Recorded paid',selected.paid],['Pending',Math.max(0,Number(selected.earned)-Number(selected.paid))]].map(([label,value])=><div key={String(label)} className="ars-card p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 font-bold">{money(Number(value))}</p></div>)}</div><p className="text-xs leading-5 text-zinc-400">Earned commission uses discounted ticket revenue and the rate saved with each reservation. Processing fees are excluded. Historical rates before this update use the rate available at migration time.</p>{activity && <div>{activity.payouts.length ? activity.payouts.map(p=><div key={p.id} className="flex flex-wrap justify-between gap-3 border-t border-white/10 py-3 text-sm"><span>{p.reference}</span><span>{new Date(p.paid_at).toLocaleDateString()}</span><span>{money(p.amount)}</span></div>):<p className="text-sm text-zinc-400">No commission payouts recorded.</p>}</div>}</div>}
    </div></div>}
  </div>;
}
