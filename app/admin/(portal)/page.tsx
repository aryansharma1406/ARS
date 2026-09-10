import {
getAdminAnalytics,getEvents,getPromoterAttributionReports,
getSettlementReports
} from '@/lib/store';
import { formatINR } from '@/lib/utils';
import {
Award,
DollarSign,Ticket,
TrendingUp,
Zap
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminOverviewPage() {
  const analytics = await getAdminAnalytics();
  const events = await getEvents();
  const promoterReports = await getPromoterAttributionReports();
  const settlements = await getSettlementReports();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="ars-card space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Gross ticket sales</span>
            <DollarSign className="w-4 h-4 text-accent-pink" />
          </div>
          <div className="text-3xl font-black text-white">{formatINR(analytics.revenue)}</div>
          <div className="text-[11px] text-zinc-500">{analytics.todaySales} paid orders processed</div>
        </div>
        <div className="ars-card space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Platform commission</span>
            <TrendingUp className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="text-3xl font-black text-accent-purple">{formatINR(analytics.commissionEarned)}</div>
          <div className="text-[11px] text-zinc-500">Net venue payout: {formatINR(analytics.revenue - analytics.commissionEarned)}</div>
        </div>
        <div className="ars-card space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Tickets sold vs used</span>
            <Ticket className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="text-3xl font-black text-white">{analytics.ticketsUsed} / {analytics.ticketsSold}</div>
          <div className="text-[11px] text-accent-emerald font-black">{analytics.attendanceRate}% door attendance rate</div>
        </div>
        <div className="ars-card space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Promoter referrals</span>
            <Zap className="w-4 h-4 text-accent-gold" />
          </div>
          <div className="text-3xl font-black text-white">{promoterReports.length} Active codes</div>
          <div className="text-[11px] text-zinc-500">Promoter attribution across the network</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 ars-card space-y-5 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-black text-white">Revenue by event</h3>
              <p className="text-xs text-zinc-500">Live performance across active event lineups</p>
            </div>
            <Link href="/admin/events" className="text-xs font-black uppercase tracking-[.16em] text-accent-cyan">Manage events</Link>
          </div>

          <div className="space-y-4">
            {!events.length && <p className="py-12 text-center text-sm text-zinc-400">No event performance yet. Published events will appear here.</p>}
            {events.map((evt) => {
              const evtSettlement = settlements.find(s => s.event_id === evt.id);
              const gross = evtSettlement ? evtSettlement.gross_revenue : 0;
              const maxCap = evt.ticket_capacity * evt.ticket_price;
              const fillPct = maxCap > 0 ? Math.min(100, Math.round((gross / maxCap) * 100)) : 0;

              return (
                <div key={evt.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-white text-sm">{evt.name}</strong>
                    <span className="font-black text-accent-pink">{formatINR(gross)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{evt.tickets_sold} / {evt.ticket_capacity} passes sold</span>
                    <span>{fillPct}% capacity revenue</span>
                  </div>
                  <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-[#cbb88a] rounded-full transition-all duration-500" style={{ width: `${fillPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 ars-card space-y-5 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2"><Award className="w-4 h-4 text-accent-gold" /> Top promoters</h3>
              <p className="text-xs text-zinc-500">Attribution codes & commission</p>
            </div>
            <Link href="/admin/promoters" className="text-xs font-black uppercase tracking-[.16em] text-accent-purple">All promoters</Link>
          </div>

          <div className="space-y-3">
            {!promoterReports.length && <p className="py-12 text-center text-sm text-zinc-400">No promoter-attributed sales yet.</p>}
            {promoterReports.map((rep) => (
              <div key={rep.source_code} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-[11px]">{rep.source_code}</span>
                    <strong className="text-white">{rep.promoter_name}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-white/10">
                  <div><span className="text-zinc-500 block">Tickets sold</span><strong className="text-white">{rep.tickets_sold} Passes</strong></div>
                  <div><span className="text-zinc-500 block">Commission ({rep.commission_percentage}%)</span><strong className="text-accent-pink">{formatINR(rep.commission_payable)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
