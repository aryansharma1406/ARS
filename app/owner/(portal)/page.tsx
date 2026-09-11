import LiveOperations from '@/components/owner/LiveOperations';
import { Bars,Empty,PageHeader,Panel,Stat,tdClass,thClass } from '@/components/owner/OwnerUI';
import { bucketByDay, getOwnerVenueData, ownerMetrics, promoterRows } from '@/lib/owner-data';
import { formatDate,formatINR,formatTime } from '@/lib/utils';
import { ArrowRight,CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default async function OwnerHome({
  searchParams,
}:{
  searchParams: Promise<{venue?:string;error?:string}>;
}){
  const query = await searchParams;
  const data = await getOwnerVenueData(query.venue);
  const metrics = ownerMetrics(data);
  const promoterRowsCached = await promoterRows(data);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const todayLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const upcoming = data.events.filter(event => new Date(`${event.date}T${event.start_time}`) > now);
  const tonight = data.events.find(event => event.date === todayLabel && event.published);
  const activeEvents = data.events.filter(event => event.published).length;
  const remainingTickets = metrics.remaining;
  const usedTickets = data.tickets.filter(ticket => ticket.status === 'USED').length;
  const attendance = metrics.sold ? Math.round((usedTickets / metrics.sold) * 100) : 0;
  const todayRevenue = metrics.todayRevenue;
  const trend = bucketByDay(data.orders, now, 7, '7D');
  const settled = data.settlements.filter(settlement => settlement.status === 'SETTLED').length;
  const pending = data.settlements.filter(settlement => settlement.status !== 'SETTLED').length;

  const upcomingAlerts = data.events
    .filter(event => event.ticket_capacity > 0 && event.tickets_sold / event.ticket_capacity >= 0.9)
    .map(event => ({
      title: 'Event almost sold out',
      copy: `${event.name} is at ${Math.round((event.tickets_sold / event.ticket_capacity) * 100)}% capacity.`,
    }));

  const settlementAmount = data.settlements.reduce((sum, settlement) => sum + Number(settlement.venue_amount), 0);

  return <>
    <PageHeader
      eyebrow={data.venue.owner_name?.trim() ? `${greeting}, ${data.venue.owner_name.trim()}` : `${greeting} / Venue operations`}
      title={data.venue.name}
      description="Business dashboard for revenue, attendance and operations."
    />

    <LiveOperations venueId={data.venue.id}/>

    {query.error && <div className="ars-card p-4 text-sm text-red-300">That venue is not assigned to your account.</div>}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Total revenue" value={formatINR(metrics.gross)} accent />
      <Stat label="Tickets sold" value={metrics.sold} />
      <Stat label="Remaining" value={remainingTickets} />
      <Stat label="Attendance" value={`${attendance}%`} />
      <Stat label="Upcoming events" value={upcoming.length} />
      <Stat label="Active events" value={activeEvents} />
      <Stat label="Average ticket value" value={formatINR(metrics.sold ? metrics.gross / metrics.sold : 0)} />
      <Stat label="Settlement status" value={pending ? `${pending} pending` : 'Settled'} />
    </div>

    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel title="Revenue · 7 days">
        <Bars labels={trend.labels} values={trend.values} />
        <div className="mt-4 flex justify-between text-[10px] uppercase tracking-widest text-zinc-700">
          <span>{trend.labels[0]}</span>
          <span>{trend.labels[trend.labels.length - 1]}</span>
        </div>
      </Panel>

      <Panel title="Ticket sales by hour">
        <Bars unit="" labels={Array.from({length:24},(_,i) => `${i}:00`)} values={Array.from({ length: 24 }, (_, hourIndex) => data.orders
          .filter(order => order.payment_status === 'PAID' && new Date(order.created_at).getHours() === hourIndex)
          .reduce((sum, order) => sum + order.quantity, 0))} />
      </Panel>

      <Panel title="Tonight’s operations" className="xl:col-span-2">
        {tonight ? (
          <div className="grid gap-4">
            <p className="font-black uppercase text-white">{tonight.name}</p>
            <p className="text-xs text-zinc-600">{formatDate(tonight.date)} · {formatTime(tonight.start_time)} - {formatTime(tonight.end_time)}</p>
            <table className="w-full text-left text-sm">
              <tbody>
                <tr><th className={thClass}>Sold</th><td className={tdClass}>{tonight.tickets_sold} / {tonight.ticket_capacity}</td></tr>
                <tr><th className={thClass}>Used</th><td className={tdClass}>{data.tickets.filter(ticket => ticket.event_id === tonight.id && ticket.status === 'USED').length}</td></tr>
                <tr><th className={thClass}>Revenue</th><td className={tdClass}>{formatINR(data.orders.filter(order => order.event_id === tonight.id && order.payment_status === 'PAID').reduce((sum, order) => sum + order.subtotal, 0))}</td></tr>
                <tr><th className={thClass}>Attendance</th><td className={tdClass}>{data.tickets.filter(ticket => ticket.event_id === tonight.id).length ? `${Math.round((data.tickets.filter(ticket => ticket.event_id === tonight.id && ticket.status === 'USED').length / data.tickets.filter(ticket => ticket.event_id === tonight.id).length) * 100)}%` : '0%'}</td></tr>
              </tbody>
            </table>
          </div>
        ) : <Empty title="No event tonight" copy="Tonight&apos;s live operations will appear when an event is scheduled." />}
      </Panel>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Panel title="Upcoming events">
        {upcoming.length ? (
          <div className="divide-y divide-white/10">
            {upcoming.slice(0, 4).map(event => (
              <div key={event.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-black uppercase text-white">{event.name}</p>
                  <p className="mt-1 text-xs text-zinc-600">{formatDate(event.date)} · {formatTime(event.start_time)}</p>
                </div>
                <p className="text-sm text-zinc-400">{event.tickets_sold} / {event.ticket_capacity}</p>
                <Link href={`/owner/events/${event.id}?venue=${data.venue.id}`} className="text-xs font-bold uppercase tracking-[.16em] text-[#d8c79e]">View event <ArrowRight className="inline" size={13}/></Link>
              </div>
            ))}
          </div>
        ) : <Empty title="No upcoming events" copy="Publish an upcoming event to populate this feed." action={<Link className="ars-button" href={`/owner/events?venue=${data.venue.id}`}>Create event</Link>} />}
      </Panel>

      <Panel title="Promoter performance">
        {promoterRowsCached.length ? (
          <div className="space-y-4">
            {promoterRowsCached.slice(0, 4).map(promoter => (
              <div key={promoter.source_code} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <p className="text-sm text-zinc-300">{promoter.promoter_name}</p>
                <p className="text-sm font-bold text-white">{promoter.tickets_sold} tickets · {formatINR(promoter.gross_entry_revenue)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-zinc-500">No promoter-attributed sales for this venue.</p>}
      </Panel>

      <Panel title="Settlements">
        <p className="text-xs text-zinc-500">{settled} settled</p>
        <p className="text-sm text-zinc-500">{pending} pending</p>
        <p className="mt-4 text-xl font-black text-white">{formatINR(settlementAmount)} total venue allocation</p>
        <p className="mt-2 text-xs text-zinc-500">Today: {formatINR(todayRevenue)} revenue</p>
      </Panel>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.7fr]">
      <Panel title="Recent activity">
        <div className="space-y-4">
          {data.orders.slice(0, 6).map(order => (
            <div key={order.id} className="flex gap-3">
              <CheckCircle2 size={15} className="mt-0.5 text-emerald-500" />
              <p className="text-xs leading-5 text-zinc-500">
                <strong className="text-zinc-300">{order.quantity} ticket{order.quantity > 1 ? 's' : ''} · {order.payment_status.toLowerCase()}</strong>
                <br />
                {formatINR(order.subtotal)} · {new Date(order.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
          {!data.orders.length && <Empty title="No activity yet" copy="Sales and entry activity will appear here." />}
        </div>
      </Panel>

      <Panel title="Owner alerts">
        {upcomingAlerts.length ? (
          <div className="space-y-4">
            {upcomingAlerts.map(alert => <div key={alert.title} className="border-b border-white/10 pb-4 text-sm text-zinc-300">{alert.copy}</div>)}
          </div>
        ) : <Empty title="All clear" copy="No actionable venue alerts right now." />}
      </Panel>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="This week" value={formatINR(metrics.weekRevenue)} />
      <Stat label="This month" value={formatINR(metrics.monthRevenue)} />
      <Stat label="ARS commission" value={formatINR(metrics.commission)} />
      <Stat label="Refunds" value={formatINR(metrics.refunds)} />
    </div>
  </>;
}
