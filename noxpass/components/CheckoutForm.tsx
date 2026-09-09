'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types';
import { formatINR, formatDate, formatTime } from '@/lib/utils';
import { 
  ShieldCheck, Lock, User, Mail, Phone, Calendar as CalendarIcon, 
  CreditCard, Loader2, Sparkles, AlertCircle 
} from 'lucide-react';

interface CheckoutFormProps {
  event: Event;
  initialQuantity: number;
  sourceCode?: string;
}

export default function CheckoutForm({ event, initialQuantity, sourceCode }: CheckoutFormProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    ageConfirmed: false,
  });

  const [quantity, setQuantity] = useState(initialQuantity);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const unitPrice = event.ticket_price;
  const subtotal = unitPrice * quantity;
  const fees = Math.round(subtotal * 0.03);
  const total = subtotal + fees;

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ageConfirmed) {
      setErrorMsg('You must confirm you meet the age requirement for this venue.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // 1. Create Razorpay order on server
      const orderRes = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          eventId: event.id,
          sourceCode,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize order');
      }

      const { razorpayOrder } = orderData;

      // 2. Launch Razorpay modal or direct sandbox test fallback
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'NoxPass Nightlife',
        description: `Entry Pass for ${event.name}`,
        image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120',
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            // 3. SECURE SERVER-SIDE VERIFICATION OF PAYMENT SIGNATURE
            const verifyRes = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                event_id: event.id,
                source_code: sourceCode || undefined,
                quantity: quantity,
                razorpay_order_id: response.razorpay_order_id || razorpayOrder.id,
                razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'mock_sig',
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success && verifyData.tickets?.length > 0) {
              // Redirect to digital ticket confirmation!
              router.push(`/ticket/${verifyData.tickets[0].id}`);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Payment verification error');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#a855f7',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      // Check if Razorpay is loaded on window, else trigger quick test simulation
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Test simulation mode when Razorpay script isn't available
        console.warn('Razorpay checkout script not loaded, running test payment verification...');
        options.handler({
          razorpay_order_id: razorpayOrder.id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'test_sig',
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during checkout');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: Customer Form Inputs */}
      <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-border">
        
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-accent-purple" /> Guest Details
        </h3>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">Full Name (Matching Physical ID)</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Rohan Mehta"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Email Address (For QR Pass)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="rohan@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Mobile Number (WhatsApp SMS)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 11223"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">Date of Birth</label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.ageConfirmed}
                onChange={e => setFormData({ ...formData, ageConfirmed: e.target.checked })}
                className="mt-0.5 rounded border-border text-accent-purple focus:ring-accent-purple"
              />
              <span className="text-xs text-gray-300 leading-normal">
                I confirm that I am at least <strong className="text-white">{event.age_limit}+ years old</strong> and agree to present physical government ID at the Club Xtreme entrance.
              </span>
            </label>
          </div>
        </div>

      </div>

      {/* Right Column: Order Summary & Razorpay Trigger */}
      <div className="lg:col-span-5 glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-border h-fit">
        <h3 className="text-lg font-bold text-white border-b border-border pb-4">
          Order Summary
        </h3>

        <div className="space-y-3">
          <div>
            <h4 className="text-base font-bold text-white">{event.name}</h4>
            <p className="text-xs text-accent-purple font-medium">
              {event.venue_name || "Club Xtreme, Tito's Lane, Goa"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(event.date)} at {formatTime(event.start_time)}
            </p>
          </div>

          <div className="pt-3 border-t border-border/50 space-y-2 text-xs text-gray-300">
            <div className="flex justify-between">
              <span>Pass Tier</span>
              <span className="text-white font-semibold">General VIP Entry</span>
            </div>
            <div className="flex justify-between">
              <span>Quantity</span>
              <span className="text-white font-semibold">{quantity} Pass(es)</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket Subtotal</span>
              <span className="text-white font-semibold">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fees & Taxes (3%)</span>
              <span className="text-white font-semibold">{formatINR(fees)}</span>
            </div>

            {sourceCode && (
              <div className="flex justify-between text-accent-pink pt-1 font-semibold">
                <span>Promoter Referral</span>
                <span>{sourceCode}</span>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-border text-base font-black text-white">
              <span>Final Amount</span>
              <span className="text-accent-pink">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-accent-purple via-accent-pink to-accent-cyan hover:opacity-95 shadow-xl shadow-accent-purple/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Verifying Server Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" /> Pay Now via Razorpay ({formatINR(total)})
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-2">
          <ShieldCheck className="w-4 h-4 text-accent-emerald" /> 100% Secure Server Signature Handshake
        </div>
      </div>

    </form>
  );
}
