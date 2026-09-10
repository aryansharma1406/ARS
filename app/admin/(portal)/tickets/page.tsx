'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { getTickets } from '@/lib/store';
import { Ticket } from '@/lib/types';
import { downloadCSV } from '@/lib/utils';
import { AlertTriangle,CheckCircle2,Download,Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect,useState } from 'react';

export default function AdminTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTicketsAndOrders();
  }, []);

  const loadTicketsAndOrders = async () => {
    setLoadError('');
    try {
    const tkts = await getTickets();
    setTickets(tkts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  };

  const filteredTickets = tickets.filter(t => {
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.customer_email.toLowerCase().includes(q) ||
      (t.source_code && t.source_code.toLowerCase().includes(q)) ||
      t.qr_token.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const exportData = filteredTickets.map(t => ({
      'Ticket ID': t.id,
      'Customer Name': t.customer_name,
      'Customer Email': t.customer_email,
      'Customer Phone': t.customer_phone,
      'Event': t.event_name,
      'Venue': t.venue_name,
      'Source Code': t.source_code || 'Direct',
      'QR Token': t.qr_token,
      'Entry Status': t.status,
      'Scanned At': t.scanned_at || 'Not Scanned',
      'Created At': t.created_at,
    }));
    downloadCSV('ARS_Ticket_Sales.csv', exportData);
  };

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadTicketsAndOrders()}>Retry loading</button></div> : !filteredTickets.length && <EmptyState title="No tickets to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">Tickets & transaction log</h2>
          <p className="text-xs text-zinc-400">View guest passes, QR tokens, payment status, and promoter sources.</p>
        </div>
        <button onClick={handleExportCSV} className="ars-button flex items-center gap-2">
          <Download className="w-4 h-4 text-accent-cyan" /> Export Ticket Sales CSV
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Filter by ticket id, customer, source" value={search} onChange={e => setSearch(e.target.value)} className="ars-input !pl-10" />
      </div>

      <div className="ars-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/30 text-zinc-500 uppercase text-[10px] font-black border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Ticket pass</th>
                <th className="px-6 py-4">Customer details</th>
                <th className="px-6 py-4">Event & venue</th>
                <th className="px-6 py-4">Source code</th>
                <th className="px-6 py-4">Door status</th>
                <th className="px-6 py-4 text-right">Pass view</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-black text-white"><span className="block text-accent-cyan">{t.qr_token}</span><span className="text-[10px] text-zinc-500 font-normal">ID: {t.id}</span></td>
                  <td className="px-6 py-4"><strong className="text-white block">{t.customer_name}</strong><span className="text-[11px] text-zinc-400 block">{t.customer_email}</span><span className="text-[11px] text-zinc-500">{t.customer_phone}</span></td>
                  <td className="px-6 py-4"><strong className="text-white block">{t.event_name}</strong><span className="text-[11px] text-accent-purple">{t.venue_name}</span></td>
                  <td className="px-6 py-4">
                    {t.source_code ? <span className="px-2.5 py-1 rounded bg-accent-pink/20 border border-accent-pink/40 text-accent-pink font-mono text-[11px]">{t.source_code}</span> : <span className="text-zinc-500 italic">Direct organic</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                      t.status === 'VALID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : t.status === 'USED' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-red-950 text-red-300'
                    }`}>
                      {t.status === 'VALID' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {t.status === 'USED' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right"><Link href={`/ticket/${t.id}`} target="_blank" className="text-xs font-black text-accent-purple">Open pass →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
