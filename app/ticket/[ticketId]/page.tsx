import DigitalTicketCard from '@/components/DigitalTicketCard';
import { requirePage,requireRole } from '@/lib/auth';
import { getEventById,getTicketById } from '@/lib/store';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface TicketPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { ticketId } = await params;
  await requirePage(()=>requireRole('customer','admin','super_admin'), '/login', `/ticket/${ticketId}`);
  const ticket = await requirePage(()=>getTicketById(ticketId), '/login');

  if (!ticket) {
    notFound();
  }

  const event = await getEventById(ticket.event_id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-xs font-bold text-emerald-300 animate-pulse">
          <Sparkles className="w-4 h-4" /> You&apos;re in
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-white">
          Your ARS pass
        </h1>
        <p className="text-xs text-gray-400">
          Show this QR code at <strong className="text-white">{ticket.venue_name || "Club Xtreme, Tito's Lane"}</strong> entrance scanner.
        </p>
      </div>

      {/* Digital Pass Card Component */}
      <DigitalTicketCard ticket={ticket} event={event} />

      {/* Links & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          href="/events"
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-gray-300 bg-surface hover:text-white border border-border text-center"
        >
          Explore more events
        </Link>

      </div>

    </div>
  );
}
