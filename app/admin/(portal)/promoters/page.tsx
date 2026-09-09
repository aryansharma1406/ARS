'use client';

import { addSource,getPromoterAttributionReports,getVenues } from '@/lib/store';
import { PromoterAttributionReport,Venue } from '@/lib/types';
import { downloadCSV,formatINR } from '@/lib/utils';
import { AlertCircle,Download,Plus,Zap } from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';

export default function AdminPromotersPage() {
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
    const rep = await getPromoterAttributionReports();
    const vns = await getVenues();
    setReports(rep);
    setVenues(vns);
    if (vns.length > 0) {
      setFormData(prev => prev.venue_id ? prev : ({ ...prev, venue_id: vns[0].id }));
    }
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

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-pink" /> Source & Promoter Tracking
          </h2>
          <p className="text-xs text-gray-400">
            Track referral links (e.g. <code className="text-accent-cyan bg-surface px-1.5 py-0.5 rounded border border-border">XYZ-ARYAN</code>) & entry revenue commissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-surface border border-border hover:bg-surface-hover transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-accent-cyan" /> Export Source Performance CSV
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-accent-purple hover:bg-accent-purple/80 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Promoter Code
          </button>
        </div>
      </div>

      {/* Critical Business Rule Banner */}
      <div className="p-4 rounded-2xl bg-surface border border-border text-xs text-gray-300 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-bold">Important Commission Rule Enforced</strong>
          <p>
            Promoter commission is calculated <strong className="text-accent-pink">ONLY on the ticket/entry revenue</strong>. No commission is calculated on food, drinks, VIP table covers, or taxes/fees.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Attributed Entry Revenue</span>
          <div className="text-2xl font-black text-white">{formatINR(totalPromoterRevenue)}</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Total Promoter Commissions Payable</span>
          <div className="text-2xl font-black text-accent-pink">{formatINR(totalCommissionPayable)}</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Active Source Codes</span>
          <div className="text-2xl font-black text-accent-purple">{reports.length} Codes</div>
        </div>
      </div>

      {/* Report Table */}
      <div className="glass-panel rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-surface/80 text-gray-400 uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4">Source / Referral Code</th>
                <th className="px-6 py-4">Promoter Name</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Tickets Sold</th>
                <th className="px-6 py-4">Gross Entry Revenue</th>
                <th className="px-6 py-4">Commission %</th>
                <th className="px-6 py-4 text-right">Commission Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {reports.map((rep) => (
                <tr key={rep.source_code} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    <span className="px-2.5 py-1 rounded bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs">
                      {rep.source_code}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-semibold text-white">
                    {rep.promoter_name}
                  </td>

                  <td className="px-6 py-4 text-accent-cyan">
                    {rep.venue_name}
                  </td>

                  <td className="px-6 py-4 font-bold text-white">
                    {rep.tickets_sold} Passes
                  </td>

                  <td className="px-6 py-4 font-semibold text-white">
                    {formatINR(rep.gross_entry_revenue)}
                  </td>

                  <td className="px-6 py-4 font-semibold text-gray-300">
                    {rep.commission_percentage}%
                  </td>

                  <td className="px-6 py-4 text-right font-black text-sm text-accent-pink">
                    {formatINR(rep.commission_payable)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Promoter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-border space-y-6">
            <h3 className="text-xl font-bold text-white">Add Promoter Referral Code</h3>

            <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Promoter Name / Influencer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Unique Source Code (URL Param)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. XYZ-ARYAN"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple uppercase"
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
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Commission %</label>
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
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
