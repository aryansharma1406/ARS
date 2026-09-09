'use client';

import React, { useState, useEffect } from 'react';
import { Settlement } from '@/lib/types';
import { getSettlementReports } from '@/lib/store';
import { formatINR, downloadCSV } from '@/lib/utils';
import { DollarSign, Download, Building2, CheckCircle2, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    const data = await getSettlementReports();
    setSettlements(data);
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
    downloadCSV('NoxPass_Venue_Settlement_Report.csv', exportData);
  };

  const totalGross = settlements.reduce((sum, s) => sum + s.gross_revenue, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission_amount, 0);
  const totalNetVenue = settlements.reduce((sum, s) => sum + s.venue_amount, 0);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent-emerald" /> Club Settlement Reports
          </h2>
          <p className="text-xs text-gray-400">
            Calculated commercial split between venue ticket payout & NoxPass platform commission.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
        >
          <Download className="w-4 h-4" /> Export Settlement CSV
        </button>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Gross Ticket Revenue</span>
          <div className="text-2xl font-black text-white">{formatINR(totalGross)}</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Platform Commission (20%)</span>
          <div className="text-2xl font-black text-accent-purple">{formatINR(totalCommission)}</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-1">
          <span className="text-xs text-gray-400">Net Payable to Venues (80%)</span>
          <div className="text-2xl font-black text-accent-emerald">{formatINR(totalNetVenue)}</div>
        </div>
      </div>

      {/* Settlement Table */}
      <div className="glass-panel rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-surface/80 text-gray-400 uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4">Venue & Event</th>
                <th className="px-6 py-4">Gross Revenue</th>
                <th className="px-6 py-4">Refunds</th>
                <th className="px-6 py-4">Eligible Entry Revenue</th>
                <th className="px-6 py-4">Commission %</th>
                <th className="px-6 py-4">Platform Commission</th>
                <th className="px-6 py-4 text-right">Net Venue Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4">
                    <strong className="text-white text-sm block">{s.event_name}</strong>
                    <span className="text-xs text-accent-purple font-semibold">{s.venue_name}</span>
                  </td>

                  <td className="px-6 py-4 font-bold text-white">
                    {formatINR(s.gross_revenue)}
                  </td>

                  <td className="px-6 py-4 text-gray-400">
                    {formatINR(s.refunds)}
                  </td>

                  <td className="px-6 py-4 font-semibold text-gray-200">
                    {formatINR(s.eligible_revenue)}
                  </td>

                  <td className="px-6 py-4 font-bold text-accent-purple">
                    {s.commission_percentage}%
                  </td>

                  <td className="px-6 py-4 font-bold text-accent-pink">
                    {formatINR(s.commission_amount)}
                  </td>

                  <td className="px-6 py-4 text-right font-black text-base text-accent-emerald">
                    {formatINR(s.venue_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
