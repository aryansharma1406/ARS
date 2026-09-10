'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { getSettlementReports } from '@/lib/store';
import { Settlement } from '@/lib/types';
import { downloadCSV,formatINR } from '@/lib/utils';
import { DollarSign,Download } from 'lucide-react';
import { useEffect,useState } from 'react';

export default function AdminSettlementsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => { loadSettlements(); }, []);

  const loadSettlements = async () => {
    setLoadError('');
    try {
    const data = await getSettlementReports();
    setSettlements(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    const exportData = settlements.map(s => ({
      'Venue Name': s.venue_name,
      'Event Name': s.event_name,
      'Gross Revenue (INR)': s.gross_revenue,
      'Refunds (INR)': s.refunds,
      'Eligible Entry Revenue (INR)': s.eligible_revenue,
      'Platform Commission Rate (%)': `${s.commission_percentage}%`,
      'Platform Commission Earned (INR)': s.commission_amount,
      'Net Payout Payable to Venue (INR)': s.venue_amount,
      'Settlement Status': s.status,
      'Created At': s.created_at,
    }));
    downloadCSV('ARS_Venue_Settlement_Report.csv', exportData);
  };

  const totalGross = settlements.reduce((sum, s) => sum + s.gross_revenue, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission_amount, 0);
  const totalNetVenue = settlements.reduce((sum, s) => sum + s.venue_amount, 0);

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadSettlements()}>Retry loading</button></div> : !settlements.length && <EmptyState title="No settlements to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-accent-emerald" /> Club settlement reports</h2>
          <p className="text-xs text-zinc-400">Platform split between venue ticket payout and ARS commission.</p>
        </div>
        <button onClick={handleExportCSV} className="ars-button flex items-center gap-2"><Download className="w-4 h-4" /> Export settlement CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="ars-card p-6"><span className="text-xs text-zinc-500">Gross ticket revenue</span><div className="text-2xl font-black text-white">{formatINR(totalGross)}</div></div>
        <div className="ars-card p-6"><span className="text-xs text-zinc-500">Platform commission</span><div className="text-2xl font-black text-accent-purple">{formatINR(totalCommission)}</div></div>
        <div className="ars-card p-6"><span className="text-xs text-zinc-500">Net payable to venues</span><div className="text-2xl font-black text-accent-emerald">{formatINR(totalNetVenue)}</div></div>
      </div>

      <div className="ars-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/30 text-zinc-500 uppercase text-[10px] font-black border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Venue & event</th>
                <th className="px-6 py-4">Gross revenue</th>
                <th className="px-6 py-4">Refunds</th>
                <th className="px-6 py-4">Eligible entry revenue</th>
                <th className="px-6 py-4">Commission %</th>
                <th className="px-6 py-4">Platform commission</th>
                <th className="px-6 py-4 text-right">Net venue payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4"><strong className="text-white text-sm block">{s.event_name}</strong><span className="text-xs text-accent-purple">{s.venue_name}</span></td>
                  <td className="px-6 py-4 font-black text-white">{formatINR(s.gross_revenue)}</td>
                  <td className="px-6 py-4 text-zinc-400">{formatINR(s.refunds)}</td>
                  <td className="px-6 py-4 font-semibold text-zinc-200">{formatINR(s.eligible_revenue)}</td>
                  <td className="px-6 py-4 font-black text-accent-purple">{s.commission_percentage}%</td>
                  <td className="px-6 py-4 font-black text-accent-pink">{formatINR(s.commission_amount)}</td>
                  <td className="px-6 py-4 text-right font-black text-base text-accent-emerald">{formatINR(s.venue_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
