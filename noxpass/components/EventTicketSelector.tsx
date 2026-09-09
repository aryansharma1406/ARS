'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { Ticket, Plus, Minus, ShieldCheck, Zap, Lock } from 'lucide-react';

interface EventTicketSelectorProps {
  event: Event;
  sourceCode?: string;
  remaining: number;
}

export default function EventTicketSelector({ event, sourceCode, remaining }: EventTicketSelectorProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const isSoldOut = remaining <= 0;

  const unitPrice = event.ticket_price;
  const subtotal = unitPrice * quantity;
  const platformFee = Math.round(subtotal * 0.03); // 3% fee
  const total = subtotal + platformFee;

  const handleProceed = () => {
    const query = new URLSearchParams();
    query.set('qty', quantity.toString());
    if (sourceCode) query.set('source', sourceCode);
    router.push(`/checkout/${event.id}?${query.toString()}`);
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-border relative">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase">Selected Tier</span>
          <h3 className="text-lg font-bold text-white">General VIP Pass</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-white">{formatINR(unitPrice)}</span>
          <span className="block text-[10px] text-gray-400">per ticket</span>
        </div>
      </div>

      {/* Quantity Control */}
      {!isSoldOut ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-border">
            <span className="text-xs font-semibold text-gray-200">Select Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-hover"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-lg text-white w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(10, Math.min(remaining, quantity + 1)))}
                disabled={quantity >= 10 || quantity >= remaining}
                className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-hover"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-xs text-gray-400 pt-2">
            <div className="flex justify-between">
              <span>Ticket Subtotal ({quantity} x {formatINR(unitPrice)})</span>
              <span className="text-white font-medium">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform & Door Processing Fee (3%)</span>
              <span className="text-white font-medium">{formatINR(platformFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/50 text-sm font-bold text-white">
              <span>Total Payable</span>
              <span className="text-accent-pink">{formatINR(total)}</span>
            </div>
          </div>

          {/* Source Attribution Tag */}
          {sourceCode && (
            <div className="p-2.5 rounded-xl bg-accent-purple/10 border border-accent-purple/30 text-xs text-accent-purple font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-pink" />
              Attributed to promoter code: <strong className="text-white">{sourceCode}</strong>
            </div>
          )}

          {/* Buy Button */}
          <button
            onClick={handleProceed}
            className="w-full py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-accent-purple via-accent-pink to-accent-cyan hover:opacity-95 shadow-xl shadow-accent-purple/20 transition-all flex items-center justify-center gap-2"
          >
            <Ticket className="w-5 h-5" /> Buy Ticket ({formatINR(total)})
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-center space-y-2">
          <span className="font-bold text-red-400 text-sm block">Sold Out for This Date</span>
          <p className="text-xs text-gray-400">Check back later or browse other Goa events.</p>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400">
        <Lock className="w-3.5 h-3.5 text-accent-emerald" /> 256-Bit SSL Razorpay Server Verification
      </div>
    </div>
  );
}
