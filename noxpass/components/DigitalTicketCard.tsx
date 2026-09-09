'use client';

import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { Ticket as TicketType, Event } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils';
import { 
  Sparkles, Calendar, Clock, MapPin, Download, CheckCircle2, 
  AlertTriangle, XCircle, Share2, ShieldCheck, QrCode 
} from 'lucide-react';

interface DigitalTicketCardProps {
  ticket: TicketType;
  event?: Event;
}

export default function DigitalTicketCard({ ticket, event }: DigitalTicketCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket.status === 'VALID') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#06b6d4', '#10b981'],
        });
      } catch (e) {
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
            <XCircle className="w-4 h-4 text-red-400" /> PAYMENT FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-300 text-xs font-bold uppercase tracking-wider">
            REFUNDED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Pass Card Container */}
      <div 
        ref={cardRef}
        className="glass-panel rounded-3xl border-2 border-accent-purple/40 overflow-hidden shadow-2xl relative"
      >
        {/* Decorative Neon Header Header */}
        <div className="bg-gradient-to-r from-accent-purple via-accent-pink to-accent-cyan p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-display font-black tracking-wider text-lg">NOXPASS VIP TICKET</span>
          </div>
          {renderStatusBadge()}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Top Info: Event Name & Venue */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
              {ticket.event_name || event?.name}
            </h2>
            <p className="text-sm text-accent-purple font-semibold flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" /> {ticket.venue_name || "Club Xtreme, Tito's Lane, Goa"}
            </p>
          </div>

          {/* QR Code Section */}
          <div className="bg-surface/90 p-6 rounded-2xl border border-border flex flex-col items-center justify-center space-y-3 relative">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG
                value={ticket.qr_token}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="text-center space-y-1">
              <code className="text-xs font-mono font-bold text-accent-cyan tracking-wider bg-card px-3 py-1 rounded-md border border-border">
                {ticket.qr_token}
              </code>
              <span className="block text-[10px] text-gray-400">
                Ticket ID: {ticket.id}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-surface/50 border border-border/50 text-xs">
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
                {event ? formatDate(event.date) : 'Upcoming'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Doors Open</span>
              <strong className="text-white text-sm block">
                {event ? formatTime(event.start_time) : '21:00'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Mobile Contact</span>
              <strong className="text-white text-sm block">{ticket.customer_phone}</strong>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Promoter Source</span>
              <strong className="text-accent-pink text-sm block">
                {ticket.source_code || 'Direct Website'}
              </strong>
            </div>
          </div>

          {ticket.scanned_at && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center text-xs text-amber-300">
              Scanned at Door: {new Date(ticket.scanned_at).toLocaleString('en-IN')}
            </div>
          )}

        </div>

        {/* Footer Disclaimer */}
        <div className="bg-surface border-t border-border p-4 text-center text-[11px] text-gray-400">
          Must present physical government photo ID matching guest name at door. Duplicate scans will trigger security alarm.
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrintDownload}
          className="px-6 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
        >
          <Download className="w-4 h-4" /> Download / Print Digital Pass
        </button>
      </div>
    </div>
  );
}
