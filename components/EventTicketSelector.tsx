'use client';

import { Event } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { Lock,Minus,Plus,Ticket,Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <>
    <div className="glass-panel p-6 sm:p-10 rounded-sm space-y-6 border border-border relative">
      <p className="eyebrow">Choose your access</p>
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase">Ticket type</span>
          <h3 className="text-2xl font-black uppercase text-white">General VIP Entry</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-white">{formatINR(unitPrice)}</span>
          <span className="block text-[10px] text-gray-400">per ticket</span>
        </div>
      </div>

      {/* Quantity Control */}
      {!isSoldOut ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-3 rounded-sm border border-border">
            <span className="text-xs font-semibold text-gray-200">Select Quantity</span>
            <div className="flex items-center gap-3">
              <button
                aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-11 h-11 rounded-sm bg-card border border-border flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-hover"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-lg text-white w-6 text-center">{quantity}</span>
              <button
                aria-label="Increase quantity" onClick={() => setQuantity(Math.min(10, Math.min(remaining, quantity + 1)))}
                disabled={quantity >= 10 || quantity >= remaining}
                className="w-11 h-11 rounded-sm bg-card border border-border flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-hover"
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
            className="ars-button w-full"
          >
            <Ticket className="w-5 h-5" /> Book now · {formatINR(total)}
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-sm bg-red-950/40 border border-red-500/40 text-center space-y-2">
          <span className="font-bold text-red-400 text-sm block">Sold Out for This Date</span>
          <p className="text-xs text-gray-400">Check back later or discover another night.</p>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400">
        <Lock className="w-3.5 h-3.5 text-accent-emerald" /> Payment verified through Razorpay
      </div>
    </div>
    {!isSoldOut && (
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-white/15 bg-black/95 px-4 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div><span className="block text-[10px] uppercase tracking-[.14em] text-zinc-500">Total · {quantity} pass{quantity === 1 ? '' : 'es'}</span><strong className="text-lg text-white">{formatINR(total)}</strong></div>
        <button onClick={handleProceed} className="ars-button !min-h-11">Book now</button>
      </div>
    )}
    </>
  );
}
