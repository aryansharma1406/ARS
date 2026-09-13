'use client';

import { LiveSearchInput, SearchHighlight } from '@/components/LiveSearch';
import { matchesSearch } from '@/lib/search';


import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpRight, Copy, Download, Plus, QrCode, Search, X } from 'lucide-react';
import { getPromoterDirectory, getPromoterActivity, savePromoter, type PromoterRecord } from '@/lib/promoter-management';
import {getAdminPromoterPerformance} from '@/lib/admin-promoter-performance';
import {promoterCommission} from '@/lib/promoter-commission';
import type { Event, Venue } from '@/lib/types';
import { downloadCSV } from '@/lib/utils';
import DisablePromoterDialog from '@/components/DisablePromoterDialog';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n));
const conversion = (p: PromoterRecord) => Number(p.visits) ? (100 * Number(p.converted_visits) / Number(p.visits)).toFixed(1) + '%' : 'Not tracked yet';
const blank = { name: '', email: '', phone: '', code: '', venue_id: '', commission_percentage: 20, event_ids: [] as string[] };
type Panel = 'details' | 'sales' | 'commission' | 'qr' | 'events';

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
  const [range,setRange]=useState('30');const [from,setFrom]=useState('');const [to,setTo]=useState('');
  const [venueFilter,setVenueFilter]=useState('all');const [eventFilter,setEventFilter]=useState('all');const [performance,setPerformance]=useState('all');
  const [report,setReport]=useState<Awaited<ReturnType<typeof getAdminPromoterPerformance>>|null>(null);const [reportError,setReportError]=useState('');const [asOf,setAsOf]=useState(()=>Date.now());
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
      try{setReport(await getAdminPromoterPerformance());setReportError('');setAsOf(Date.now());}catch{setReport(null);setReportError('Period performance unavailable. Please retry loading.');}
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
      const row = { ID: p.id, Name: p.name, Email: p.email || '', Phone: p.phone || '', Status: p.active ? 'Active' : 'Disabled', Code: p.code, Link: referral(p), Venue: p.venue_name, Events: p.event_ids.length ? events.filter(e => p.event_ids.includes(e.id)).map(e => e.name).join('; ') : 'All venue events', 'Period': range, 'From': range==='CUSTOM'?from:new Date(start).toISOString(), 'To': new Date(end).toISOString(), 'Event filter':eventFilter, 'Commission %': p.commission_percentage, 'Tickets sold': p.tickets_sold, 'Discounted revenue': p.revenue, Entries: p.entries, Visits: p.visits, 'Conversion (all time)': conversion(p), 'Commission earned (selected period)': p.earned, 'Recorded paid (all time)': p.paid, 'Pending (all time)': pendingFor(p) };
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
  const today=new Date(asOf+330*60000).toISOString().slice(0,10);
  const start=range==='CUSTOM'?Date.parse(from+'T00:00:00+05:30'):asOf-Number(range)*86400000;
  const end=range==='CUSTOM'?Math.min(asOf,Date.parse(to+'T23:59:59.999+05:30')):asOf;
  const valid=Number.isFinite(start)&&Number.isFinite(end)&&start<=end;
  const ordersFor=(p:PromoterRecord,eventId=eventFilter)=>{
    const ids=new Set(events.filter(e=>e.venue_id===p.venue_id&&(eventId==='all'||e.id===eventId)).map(e=>e.id));
    return (report?.orders||[]).filter(o=>o.source_code===p.code&&ids.has(o.event_id)&&o.payment_status==='PAID'&&Date.parse(o.created_at)>=start&&Date.parse(o.created_at)<=end);
  };
  const pendingFor=(p:PromoterRecord)=>{const original=promoters.find(row=>row.id===p.id);return original?Math.max(0,Number(original.earned)-Number(original.paid)):0;};
  const scoped=promoters.map(p=>{
    const orders=ordersFor(p);const ids=new Set(orders.map(o=>o.id));
    return {...p,tickets_sold:orders.reduce((sum,o)=>sum+Number(o.quantity),0),revenue:orders.reduce((sum,o)=>sum+Number(o.subtotal),0),earned:promoterCommission(orders,Number(p.commission_percentage)),entries:(report?.tickets||[]).filter(t=>ids.has(t.order_id)&&t.status==='USED').length};
  });
  const filtered = scoped.filter(p => valid&&(status==='all'||p.active===(status==='active'))&&(venueFilter==='all'||p.venue_id===venueFilter)&&(eventFilter==='all'||ordersFor(p).length>0||(events.some(e=>e.id===eventFilter&&e.venue_id===p.venue_id)&&(!p.event_ids.length||p.event_ids.includes(eventFilter))))&&(performance==='all'||(performance==='sales'?p.tickets_sold>0:performance==='no-sales'?p.tickets_sold===0:pendingFor(p)>0))&&matchesSearch(search,[p.name,p.email,p.phone,p.code,p.venue_name,...p.event_ids.map(id=>events.find(e=>e.id===id)?.name)])).sort((a,b)=>Number(b.revenue)-Number(a.revenue)||a.name.localeCompare(b.name));
  const total=(field:'revenue'|'earned'|'paid'|'tickets_sold'|'visits'|'converted_visits')=>filtered.reduce((sum,p)=>sum+Number(p[field]),0);
  const actionClass = 'rounded-sm border border-white/15 px-3 py-2 text-[11px] font-semibold text-zinc-300 transition hover:border-[#cbb88a] hover:text-[#cbb88a] disabled:opacity-40';

  return <div className="space-y-6">
    {disableTarget && <DisablePromoterDialog name={disableTarget.name} code={disableTarget.code} busy={busy} error={disableError} onCancel={() => setDisableTarget(null)} onConfirm={() => void toggle(disableTarget, true)}/>}
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Partner network</p><h1 className="mt-3 text-3xl font-black uppercase">Promoters & referrals</h1><p className="mt-3 max-w-2xl text-sm text-zinc-400">One link per promoter code. Commission applies to paid, discounted ticket revenue, excluding processing fees.</p></div><div className="flex gap-3"><button disabled={loading||!report||!valid} className="ars-button ars-button-secondary" onClick={() => exportReport(filtered)}><Download size={15}/> Export report</button><button disabled={loading} className="ars-button" onClick={() => edit()}><Plus size={15}/> Add promoter</button></div></div>
    {error && !editor && <div role="alert" className="ars-card border-red-400/40 p-4 text-red-300">{error}<button className={actionClass + ' ml-4'} onClick={() => { setError(''); void load(); }}>Retry</button></div>}
    {notice && <p role="status" className="break-all text-sm text-[#cbb88a]">{notice}</p>}
    {reportError&&<p role="alert" className="text-amber-200">{reportError}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{[['Active Promoters',filtered.filter(p=>p.active).length],['Tickets Sold',report?total('tickets_sold'):'Unavailable'],['Revenue Generated',report?money(total('revenue')):'Unavailable'],['Conversion / all time',total('visits')?(total('converted_visits')/total('visits')*100).toFixed(1)+'%':'Not tracked'],['Commission Earned',report?money(total('earned')):'Unavailable'],['Pending Payout / all time',money(filtered.reduce((sum,p)=>sum+pendingFor(p),0))]].map(([label,value])=><div key={String(label)} className="ars-card bg-gradient-to-br from-[#cbb88a]/[.06] to-transparent p-4"><p className="text-[10px] text-zinc-500">{label}</p><p className="mt-3 break-words text-xl font-semibold text-[#e5d8b7]">{value}</p></div>)}</div>
    <section className="ars-card space-y-4 p-4"><div className="flex flex-wrap gap-2">{['7','30','90','CUSTOM'].map(value=><button key={value} aria-pressed={range===value} onClick={()=>{setRange(value);if(value==='CUSTOM'){setFrom(today);setTo(today);}}} className={`ars-button !px-3 !py-2 !text-xs ${range===value?'':'ars-button-secondary'}`}>{value==='CUSTOM'?'Custom':value+'D'}</button>)}</div>{range==='CUSTOM'&&<div className="flex flex-wrap gap-3"><label className="text-xs text-zinc-400">From<input type="date" max={today} value={from} onChange={e=>setFrom(e.target.value)} className="ars-input mt-1 [color-scheme:dark]"/></label><label className="text-xs text-zinc-400">To<input type="date" max={today} value={to} onChange={e=>setTo(e.target.value)} className="ars-input mt-1 [color-scheme:dark]"/></label></div>}{!valid&&<p role="alert" className="text-xs text-amber-200">Choose a valid date range.</p>}
      <LiveSearchInput value={search} onChange={setSearch} placeholder="Search promoter, code, venue or event"/>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select aria-label="Venue filter" value={venueFilter} onChange={e=>{setVenueFilter(e.target.value);setEventFilter('all');}} className="ars-select"><option value="all">All venues</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select aria-label="Event filter" value={eventFilter} onChange={e=>setEventFilter(e.target.value)} className="ars-select"><option value="all">All events</option>{events.filter(e=>venueFilter==='all'||e.venue_id===venueFilter).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select><select aria-label="Status filter" className="ars-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select><select aria-label="Performance filter" className="ars-select" value={performance} onChange={e=>setPerformance(e.target.value)}><option value="all">All performance</option><option value="sales">With paid sales</option><option value="no-sales">No paid sales</option><option value="pending">Pending payout (all time)</option></select></div>
    </section>
    <div className="flex items-center gap-3 text-xs text-zinc-500"><span>{filtered.length} promoters / ranked by selected-period revenue</span><div className="group relative"><button aria-label="Metric definitions" aria-describedby="promoter-metric-info" className="h-6 w-6 rounded-full border border-[#cbb88a]/40 text-[#cbb88a]">i</button><div id="promoter-metric-info" role="tooltip" className="pointer-events-none invisible absolute right-0 top-8 z-20 w-72 rounded border border-[#cbb88a]/30 bg-[#171610] p-4 text-xs leading-6 text-zinc-300 opacity-0 shadow-xl group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">Revenue and earned commission use paid orders created in range, discounted subtotal and saved reservation rates, excluding fees. Existing rounding and test orders are preserved. Check-ins count used passes on those orders. Conversion is the existing all-time tracked-visit conversion, not date/event scoped. Paid and pending payout are existing all-time promoter totals; payouts cannot be allocated to an event or earning period. Event breakdown rounding may differ from combined totals. CSV labels these scopes explicitly.</div></div></div>
    <div className="ars-card overflow-x-auto"><table className="w-full min-w-[1450px] text-left text-xs"><thead><tr>{['Promoter','Code','Venue','Events','Tickets','Revenue','Check-ins','Conversion','Commission','Payout Status','Actions'].map(h=><th key={h} className="border-b border-white/10 p-3 text-[9px] uppercase tracking-wider text-zinc-500">{h}</th>)}</tr></thead><tbody>{filtered.map((p,index)=><tr key={p.id} className="border-b border-white/10 align-top hover:bg-white/[.02]">
      <td className="p-3"><p className="font-semibold text-white"><span className="mr-2 text-[#cbb88a]">#{index+1}</span><SearchHighlight query={search}>{p.name}</SearchHighlight></p><p className="mt-2 text-[10px] text-zinc-500">{p.active?'Active':'Disabled'}</p></td>
      <td className="p-3"><p className="font-mono text-[#cbb88a]"><SearchHighlight query={search}>{p.code}</SearchHighlight></p><div className="mt-2 flex flex-wrap gap-2"><button className={actionClass} onClick={()=>void copy(p)}>Copy Link</button><button className={actionClass} onClick={()=>void view(p,'qr')}>Download QR</button></div></td>
      <td className="p-3"><SearchHighlight query={search}>{p.venue_name}</SearchHighlight></td><td className="p-3"><button onClick={()=>void view(p,'events')} className="text-[#cbb88a] underline">{new Set(ordersFor(p).map(o=>o.event_id)).size} with sales</button><p className="mt-2 text-[10px] text-zinc-500">{p.event_ids.length?p.event_ids.length+' assigned':'All venue events'}</p></td>
      <td className="p-3">{report?p.tickets_sold:'Unavailable'}</td><td className="p-3 text-[#cbb88a]">{report?money(p.revenue):'Unavailable'}</td><td className="p-3">{report?p.entries:'Unavailable'}</td><td className="p-3">{conversion(p)}<p className="mt-1 text-[9px] text-zinc-500">All time</p></td>
      <td className="space-y-2 whitespace-nowrap p-3"><p>{p.commission_percentage}% current</p><p>Earned: {report?money(p.earned):'Unavailable'}</p><p className="text-zinc-500">Paid (all time): {money(p.paid)}</p><p className="text-[#cbb88a]">Pending (all time): {money(pendingFor(p))}</p></td><td className="p-3"><span className="rounded-full border border-[#cbb88a]/25 px-2 py-1 text-[10px] text-[#cbb88a]">{pendingFor(p)>0?(Number(p.paid)>0?'Partially paid':'Pending'):Number(p.paid)>0?'Paid':'No payout due'}</span><p className="mt-2 text-[9px] text-zinc-500">All-time ledger</p></td>
      <td className="p-3"><div className="flex flex-wrap gap-2"><button className={actionClass} onClick={()=>void view(p,'details')}>Details</button><button className={actionClass} onClick={()=>void view(p,'events')}>Event Performance</button><button className={actionClass} onClick={()=>edit(p)}>Edit</button><button disabled={busy} className={actionClass} onClick={()=>void toggle(p)}>{p.active?'Disable':'Enable'}</button><button className={actionClass} onClick={()=>void view(p,'sales')}>Sales</button><button className={actionClass} onClick={()=>void view(p,'commission')}>Commission</button><button disabled={!report||!valid} className={actionClass} onClick={()=>exportReport([p])}>Export</button></div></td>
    </tr>)}</tbody></table>{!filtered.length&&<p className="p-8 text-zinc-400">{loading?'Loading promoters...':'No promoters match these filters.'}</p>}</div>

    {editor && <div onClick={event=>{if(event.target===event.currentTarget&&!busy)setEditor(null);}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"><div role="dialog" aria-modal="true" aria-label="Promoter details" className="ars-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-6"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{editor.id ? 'Edit promoter' : 'Add promoter'}</h2><button disabled={busy} aria-label="Close editor" onClick={() => setEditor(null)}><X/></button></div><form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><label className="ars-label">Name<input required maxLength={150} className="ars-input mt-2" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label className="ars-label">Email<input type="email" maxLength={254} className="ars-input mt-2" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label><label className="ars-label">Phone<input type="tel" maxLength={30} className="ars-input mt-2" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}/></label><label className="ars-label">Referral code<input required readOnly={Boolean(editor.id)} maxLength={80} className="ars-input mt-2 uppercase" value={form.code} onChange={e => setForm({...form,code:e.target.value})}/></label><label className="ars-label">Assigned venue<select required disabled={Boolean(editor.id)} className="ars-select mt-2" value={form.venue_id} onChange={e => setForm({...form,venue_id:e.target.value,event_ids:[]})}><option value="">Choose venue</option>{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label className="ars-label">Commission %<input required type="number" min={0} max={100} step="0.01" className="ars-input mt-2" value={form.commission_percentage} onChange={e => setForm({...form,commission_percentage:Number(e.target.value)})}/></label></div><fieldset className="space-y-3 border-t border-white/10 pt-4"><legend className="text-sm font-semibold">Assigned events</legend><p className="text-xs text-zinc-400">Leave all unchecked to include all current and future events at this venue.</p>{events.filter(e => e.venue_id===form.venue_id).map(e => <label key={e.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.event_ids.includes(e.id)} onChange={change => setForm({...form,event_ids:change.target.checked?[...form.event_ids,e.id]:form.event_ids.filter(id=>id!==e.id)})}/>{e.name}</label>)}</fieldset>{editor.id && <p className="text-xs text-zinc-400">ID: {editor.id}. Code and venue stay fixed to protect attribution history. Commission changes apply to new reservations.</p>}<button disabled={busy} className="ars-button">{busy?'Saving...':'Save promoter'}</button></form></div></div>}
    {selected && <div onClick={event=>{if(event.target===event.currentTarget){requestId.current++;setSelected(null);}}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"><div role="dialog" aria-modal="true" aria-label={selected.name+' '+panel} className="ars-card max-h-[90dvh] w-full max-w-3xl overflow-y-auto p-6"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="eyebrow">{panel}</p><h2 className="mt-2 text-2xl font-bold">{selected.name}</h2></div><button aria-label="Close details" onClick={() => { requestId.current++; setSelected(null); }}><X/></button></div>
      {panel==='qr' && <div className="space-y-5"><div ref={qr} className="mx-auto w-fit bg-white p-5"><QRCodeSVG value={referral(selected)} size={240} level="M" marginSize={4}/></div><p className="break-all text-center text-xs text-zinc-400">{referral(selected)}</p><button className="ars-button mx-auto" onClick={downloadQR}><Download size={16}/> Download QR (SVG)</button></div>}
      {panel==='events'&&<div className="overflow-x-auto"><p className="mb-4 text-xs text-zinc-500">Paid bookings in the selected date range. Existing event filter applies.</p><table className="w-full text-left text-xs"><thead><tr>{['Event','Tickets','Revenue','Check-ins','Commission'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{events.filter(e=>e.venue_id===selected.venue_id&&(eventFilter==='all'||e.id===eventFilter)&&ordersFor(selected,e.id).length>0).map(e=>{const orders=ordersFor(selected,e.id);const ids=new Set(orders.map(o=>o.id));return <tr key={e.id} className="border-t border-white/10"><td className="p-3">{e.name}</td><td className="p-3">{orders.reduce((sum,o)=>sum+Number(o.quantity),0)}</td><td className="p-3">{money(orders.reduce((sum,o)=>sum+Number(o.subtotal),0))}</td><td className="p-3">{report?.tickets.filter(t=>ids.has(t.order_id)&&t.status==='USED').length}</td><td className="p-3">{money(promoterCommission(orders,Number(selected.commission_percentage)))}</td></tr>;})}</tbody></table>{!ordersFor(selected).length&&<p className="p-4 text-zinc-500">No paid event sales in this period.</p>}</div>}
      {panel==='details' && <dl className="grid gap-4 sm:grid-cols-2">{[['Promoter ID',selected.id],['Email',selected.email||'Not added'],['Phone',selected.phone||'Not added'],['Status',selected.active?'Active':'Disabled'],['Referral code',selected.code],['Referral link',referral(selected)],['Venue',selected.venue_name],['Assigned events',selected.event_ids.length?selected.event_ids.map(id=>events.find(e=>e.id===id)?.name||id).join(', '):'All venue events'],['Current commission',selected.commission_percentage+'%'],['Conversion',conversion(selected)]].map(([label,value])=><div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-2 break-all text-sm">{value}</dd></div>)}</dl>}
      {activityError && <p role="alert" className="text-red-300">{activityError}</p>}
      {(panel==='sales'||panel==='commission') && !activity && !activityError && <p>Loading records...</p>}
      {panel==='sales' && activity && <div className="overflow-x-auto"><p className="mb-4 text-xs text-zinc-500">Latest 200 orders, filtered to the selected period/event. Revenue includes paid orders only.</p><table className="w-full text-left text-xs"><thead><tr>{['Order','Date','Tickets','Discounted subtotal','Status'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{activity.sales.filter(o=>Date.parse(o.created_at)>=start&&Date.parse(o.created_at)<=end&&(eventFilter==='all'||report?.orders.some(row=>row.id===o.id&&row.event_id===eventFilter))).map(o=><tr key={o.id} className="border-t border-white/10"><td className="p-3 font-mono">{o.id}</td><td className="p-3">{new Date(o.created_at).toLocaleString()}</td><td className="p-3">{o.quantity}</td><td className="p-3">{money(o.subtotal)}</td><td className="p-3">{o.payment_status}</td></tr>)}</tbody></table>{!activity.sales.length&&<p className="p-4">No sales yet.</p>}</div>}
      {panel==='commission' && <div className="space-y-5"><div className="grid grid-cols-3 gap-3">{[['Earned in range',selected.earned],['Paid / all time',selected.paid],['Pending / all time',pendingFor(selected)]].map(([label,value])=><div key={String(label)} className="ars-card p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 font-bold">{money(Number(value))}</p></div>)}</div><p className="text-xs leading-5 text-zinc-400">Earned commission uses discounted ticket revenue and the rate saved with each reservation. Processing fees are excluded. Historical rates before this update use the rate available at migration time.</p>{activity && <div>{activity.payouts.length ? activity.payouts.map(p=><div key={p.id} className="flex flex-wrap justify-between gap-3 border-t border-white/10 py-3 text-sm"><span>{p.reference}</span><span>{new Date(p.paid_at).toLocaleDateString()}</span><span>{money(p.amount)}</span></div>):<p className="text-sm text-zinc-400">No commission payouts recorded.</p>}</div>}</div>}
    </div></div>}
  </div>;
}
