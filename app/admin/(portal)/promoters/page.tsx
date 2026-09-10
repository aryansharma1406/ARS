'use client';

import { EmptyState, PageLoading } from '@/components/PageState';

import { addSource,getPromoterAttributionReports,getVenues } from '@/lib/store';
import { PromoterAttributionReport,Venue } from '@/lib/types';
import { downloadCSV,formatINR } from '@/lib/utils';
import { AlertCircle,Download,Plus,Zap } from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';

export default function AdminPromotersPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reports, setReports] = useState<PromoterAttributionReport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    venue_id: '',
    commission_percentage: 20.0,
  });

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
    const rep = await getPromoterAttributionReports();
    const vns = await getVenues();
    setReports(rep);
    setVenues(vns);
    if (vns.length > 0) {
      setFormData(prev => prev.venue_id ? prev : ({ ...prev, venue_id: vns[0].id }));
    }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load records.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSource({
      ...formData,
      code: formData.code.trim().toUpperCase(),
      commission_percentage: Number(formData.commission_percentage),
      active: true,
    });
    setIsModalOpen(false);
    setFormData({
      name: '',
      code: '',
      venue_id: venues[0]?.id || '',
      commission_percentage: 20.0,
    });
    loadData();
  };

  const handleExportCSV = () => {
    const exportData = reports.map(r => ({
      'Promoter Source Code': r.source_code,
      'Promoter Name': r.promoter_name,
      'Venue': r.venue_name,
      'Tickets Sold': r.tickets_sold,
      'Gross Entry Revenue': r.gross_entry_revenue,
      'Commission Rate (%)': `${r.commission_percentage}%`,
      'Commission Payable (INR)': r.commission_payable,
    }));
    downloadCSV('ARS_Promoter_Commission_Report.csv', exportData);
  };

  const totalPromoterRevenue = reports.reduce((sum, r) => sum + r.gross_entry_revenue, 0);
  const totalCommissionPayable = reports.reduce((sum, r) => sum + r.commission_payable, 0);

  if (loading) return <PageLoading/>;

  return (
    <div className="space-y-6">
      {loadError ? <div role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-5 text-sm text-red-200"><p>{loadError}</p><button className="ars-button ars-button-secondary mt-4" onClick={() => void loadData()}>Retry loading</button></div> : !reports.length && <EmptyState title="No promoters to display" copy="Records matching this view will appear here when available."/>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2"><Zap className="w-5 h-5 text-accent-pink" /> Source & promoter tracking</h2>
          <p className="text-xs text-zinc-400">Track referral links and entry revenue commissions.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="ars-button flex items-center gap-2"><Download className="w-4 h-4 text-accent-cyan" /> Export source report</button>
          <button onClick={() => setIsModalOpen(true)} className="ars-button ars-button-secondary flex items-center gap-2"><Plus className="w-4 h-4" /> Add promoter code</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-black/30 border border-white/10 text-xs text-zinc-300 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-accent-cyan" /> <span><strong className="text-white">Commission rule:</strong> promoter commission is calculated only on ticket/entry revenue.</span></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="ars-card p-6">
          <span className="text-xs text-zinc-500">Attributed entry revenue</span>
          <div className="text-2xl font-black text-white">{formatINR(totalPromoterRevenue)}</div>
        </div>
        <div className="ars-card p-6">
          <span className="text-xs text-zinc-500">Total payable commission</span>
          <div className="text-2xl font-black text-accent-pink">{formatINR(totalCommissionPayable)}</div>
        </div>
        <div className="ars-card p-6">
          <span className="text-xs text-zinc-500">Active source codes</span>
          <div className="text-2xl font-black text-accent-purple">{reports.length} Codes</div>
        </div>
      </div>

      <div className="ars-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/30 text-zinc-500 uppercase text-[10px] font-black border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Source / Referral code</th>
                <th className="px-6 py-4">Promoter name</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Tickets sold</th>
                <th className="px-6 py-4">Gross entry revenue</th>
                <th className="px-6 py-4">Commission %</th>
                <th className="px-6 py-4 text-right">Commission payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.map((rep) => (
                <tr key={rep.source_code} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-black text-white"><span className="px-2.5 py-1 rounded bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs">{rep.source_code}</span></td>
                  <td className="px-6 py-4 font-semibold text-white">{rep.promoter_name}</td>
                  <td className="px-6 py-4 text-accent-cyan">{rep.venue_name}</td>
                  <td className="px-6 py-4 font-black text-white">{rep.tickets_sold} Passes</td>
                  <td className="px-6 py-4 font-semibold text-white">{formatINR(rep.gross_entry_revenue)}</td>
                  <td className="px-6 py-4 font-semibold text-zinc-400">{rep.commission_percentage}%</td>
                  <td className="px-6 py-4 text-right font-black text-sm text-accent-pink">{formatINR(rep.commission_payable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="ars-card max-w-lg w-full p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-black text-white">Add promoter referral code</h3>
            <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
              <div><label className="ars-label">Promoter name / influencer</label><input type="text" required placeholder="Aryan Sharma" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="ars-input" /></div>
              <div><label className="ars-label">Unique source code (url param)</label><input type="text" required placeholder="XYZ-ARYAN" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="ars-input uppercase" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="ars-label">Assigned venue</label>
                  <select value={formData.venue_id} onChange={e => setFormData({ ...formData, venue_id: e.target.value })} className="ars-select">{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                </div>
                <div><label className="ars-label">Commission %</label><input type="number" step="0.1" required placeholder="20.0" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} className="ars-input" /></div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="ars-button ars-button-secondary w-1/2">Cancel</button>
                <button type="submit" className="ars-button w-1/2">Create code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
