import React from 'react';
import { 
  getAdminAnalytics, getEvents, getPromoterAttributionReports, 
  getSettlementReports, getTickets 
} from '@/lib/store';
import { formatINR } from '@/lib/utils';
import { 
  DollarSign, Ticket, Users, CheckCircle2, TrendingUp, 
  Zap, Building2, Calendar, Award 
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminOverviewPage() {
  const analytics = await getAdminAnalytics();
  const events = await getEvents();
  const promoterReports = await getPromoterAttributionReports();
  const settlements = await getSettlementReports();
  const tickets = await getTickets();

  return (
    <div className="space-y-8">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-panel p-6 rounded-3xl border border-border space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Gross Ticket Sales</span>
            <DollarSign className="w-4 h-4 text-accent-pink" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {formatINR(analytics.revenue)}
          </div>
          <div className="text-[11px] text-gray-400">
            {analytics.todaySales} paid orders processed
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Platform Commission (20%)</span>
            <TrendingUp className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-accent-purple">
            {formatINR(analytics.commissionEarned)}
          </div>
          <div className="text-[11px] text-gray-400">
            Net venue payout: {formatINR(analytics.revenue - analytics.commissionEarned)}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Tickets Sold vs Used</span>
            <Ticket className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {analytics.ticketsUsed} / {analytics.ticketsSold}
          </div>
          <div className="text-[11px] text-accent-emerald font-semibold">
            {analytics.attendanceRate}% Door Attendance Rate
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-border space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Promoter Referrals</span>
            <Zap className="w-4 h-4 text-accent-gold" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {promoterReports.length} Active Codes
          </div>
          <div className="text-[11px] text-gray-400">
            Top code: <strong className="text-accent-pink">XYZ-ARYAN</strong>
          </div>
        </div>

      </div>

      {/* Grid: Events Revenue Breakdown & Top Promoters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Revenue by Event */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-border space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Revenue by Event</h3>
              <p className="text-xs text-gray-400">Track entry sales across Club Xtreme lineups</p>
            </div>
            <Link href="/admin/events" className="text-xs font-semibold text-accent-cyan hover:underline">
              Manage Events &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {events.map((evt) => {
              const evtSettlement = settlements.find(s => s.event_id === evt.id);
              const gross = evtSettlement ? evtSettlement.gross_revenue : 0;
              const maxCap = evt.ticket_capacity * evt.ticket_price;
              const fillPct = maxCap > 0 ? Math.min(100, Math.round((gross / maxCap) * 100)) : 0;

              return (
                <div key={evt.id} className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-white text-sm">{evt.name}</strong>
                    <span className="font-bold text-accent-pink">{formatINR(gross)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{evt.tickets_sold} / {evt.ticket_capacity} Passes Sold</span>
                    <span>{fillPct}% Capacity Revenue</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-border/50">
                    <div 
                      className="h-full bg-gradient-to-r from-accent-purple to-accent-pink rounded-full transition-all duration-500"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Top Promoters Leaderboard */}
        <div className="lg:col-span-5 glass-panel p-6 sm:p-8 rounded-3xl border border-border space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-accent-gold" /> Top Promoters
              </h3>
              <p className="text-xs text-gray-400">Attribution codes & commission</p>
            </div>
            <Link href="/admin/promoters" className="text-xs font-semibold text-accent-purple hover:underline">
              All Promoters &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {promoterReports.map((rep) => (
              <div key={rep.source_code} className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-accent-purple/20 border border-accent-purple/40 text-accent-purple font-mono font-bold text-[11px]">
                      {rep.source_code}
                    </span>
                    <strong className="text-white">{rep.promoter_name}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 pt-1 border-t border-border/40">
                  <div>
                    <span className="text-gray-400 block">Tickets Sold</span>
                    <strong className="text-white text-xs">{rep.tickets_sold} Passes</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Commission Payable ({rep.commission_percentage}%)</span>
                    <strong className="text-accent-pink text-xs">{formatINR(rep.commission_payable)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
