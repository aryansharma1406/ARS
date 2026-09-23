'use client';

import { Event,Ticket as TicketType } from '@/lib/types';
import { formatDate,formatTime } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
AlertTriangle,
CheckCircle2,
Download,
MapPin,
Sparkles,
XCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect,useRef } from 'react';
import {useRouter} from 'next/navigation';

interface DigitalTicketCardProps {
  ticket: TicketType;
  event?: Event;
}

export default function DigitalTicketCard({ ticket, event }: DigitalTicketCardProps) {
  const router=useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket.status === 'VALID' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        confetti({
          particleCount: 28,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#cbb88a', '#f5f3ee', '#6f6857', '#10b981'],
        });
      } catch {
        // Safe confetti fallback
      }
    }
  }, [ticket.status]);

  const handlePrintDownload = () => {
    window.print();
  };

  // Status Badge Helper
  const renderStatusBadge = () => {
    switch (ticket.status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> VALID PASS
          </span>
        );
      case 'USED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> PASS USED AT DOOR
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-4 h-4 text-red-400" /> INVALID · PAYMENT FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-300 text-xs font-bold uppercase tracking-wider">
            INVALID · REFUNDED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pass-card space-y-4">
      {/* Pass Card Container */}
      <div 
        ref={cardRef}
        className="rounded-2xl border border-[#cbb88a]/40 overflow-hidden relative bg-[radial-gradient(ellipse_at_top_right,rgba(203,184,138,.14),transparent_60%),linear-gradient(135deg,#151510,#080808)] shadow-[0_24px_80px_rgba(0,0,0,.45)]"
      >
        {/* Decorative Neon Header Header */}
        <div className="border-b border-[#cbb88a]/30 p-5 sm:p-7 flex flex-wrap gap-3 items-center justify-between text-[#e2d4ae]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-display font-black tracking-[.18em] text-lg">ARS / DIGITAL ACCESS</span>
          </div>
          {renderStatusBadge()}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Top Info: Event Name & Venue */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl uppercase leading-tight font-display font-black text-white">
              {ticket.event_name || event?.name}
            </h2>
            <p className="text-sm text-accent-purple font-semibold flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {ticket.venue_name || event?.venue_name || 'Venue not available'}
            </p>
          </div>

          {/* QR Code Section */}
          {ticket.group_id && <section className="border border-[#cbb88a]/40 p-4 text-[#e2d4ae]"><h3 className="font-bold">GROUP PASS</h3><p>{ticket.checked_in_quantity} / {ticket.purchased_quantity} guests entered</p><p>Remaining: {ticket.remaining_quantity}</p><button type="button" onClick={()=>router.refresh()} className="mt-2 text-xs underline">Refresh entry status</button></section>}
          <div className="pass-perforation border-y border-dashed border-[#cbb88a]/30 px-3 py-8 flex flex-col items-center justify-center space-y-4 relative">
            <p className="text-[10px] uppercase tracking-[.24em] text-[#e2d4ae]">{ticket.group_id ? 'One QR for this group booking' : 'Your personal entry credential'}</p>
            <div className="bg-white p-6 rounded-xl ring-1 ring-[#cbb88a]/50 ring-offset-4 ring-offset-[#11110f]">
              <QRCodeSVG
                value={ticket.qr_token}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="space-y-2">
              <code className="block max-w-full break-all text-center text-[10px] font-mono text-zinc-500 px-3 py-1">
                {ticket.qr_token}
              </code>
              <span className="block break-all text-center text-[10px] text-gray-400">
                Ticket ID: {ticket.id}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 rounded-sm bg-surface/50 border border-border/50 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Guest Holder</span>
              <strong className="text-white text-sm block">{ticket.customer_name}</strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Pass Tier</span>
              <strong className="text-white text-sm block">{ticket.ticket_type}</strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Date</span>
              <strong className="text-white text-sm block">
                {event ? formatDate(event.date) : 'Not available'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Doors Open</span>
              <strong className="text-white text-sm block">
                {event ? formatTime(event.start_time) : 'Not available'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Mobile Contact</span>
              <strong className="text-white text-sm block">{ticket.customer_phone}</strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Admission</span>
              <strong className="text-accent-pink text-sm block">
                {ticket.group_id ? `${ticket.purchased_quantity} guests / partial entry allowed` : 'One guest / Single entry'}
              </strong>
            </div>
          </div>

          {ticket.scanned_at && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center text-xs text-amber-300">
              Scanned at Door: {new Date(ticket.scanned_at).toLocaleString('en-IN')}
            </div>
          )}

          {(ticket.tier_description || !!ticket.tier_benefits?.length) && <section className="border-t border-[#cbb88a]/25 pt-4"><h3 className="text-sm font-semibold text-[#e2d4ae]">Your pass includes</h3>{ticket.tier_description&&<p className="mt-2 text-xs leading-6 text-zinc-300">{ticket.tier_description}</p>}<ul className="mt-2 list-inside list-disc text-xs leading-6 text-zinc-300">{ticket.tier_benefits?.filter(Boolean).map((benefit,index)=><li key={index}>{benefit}</li>)}</ul></section>}


        </div>

        {/* Footer Disclaimer */}
        <div className="bg-surface border-t border-border p-4 text-center text-[11px] text-gray-400">
          Must present physical government photo ID matching guest name at door. Single passes admit one guest. Group passes admit only the purchased quantity, confirmed by staff.
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrintDownload}
          className="ars-button"
        >
          <Download className="w-4 h-4" /> Download / Print Digital Pass
        </button>
      </div>
    </div>
  );
}
