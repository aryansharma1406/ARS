'use client';

import { Event } from '@/lib/types';
import { formatDate,formatTime } from '@/lib/utils';
import {
AlertCircle,
Calendar as CalendarIcon,
CreditCard,
Mail,
Phone,
ShieldCheck,
User
} from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import { useRouter } from 'next/navigation';
import React,{ useEffect,useState } from 'react';

interface CheckoutFormProps {
  event: Event;
  accountEmail: string;
  initialQuantity: number;
  sourceCode?: string;
}

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(amount);

export default function CheckoutForm({ event, initialQuantity, sourceCode, accountEmail }: CheckoutFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: accountEmail,
    phone: '',
    dob: '',
    ageConfirmed: false,
  });

  const [quantity] = useState(initialQuantity);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [promoterCode, setPromoterCode] = useState('');
  const [referralCode, setReferralCode] = useState(sourceCode || '');
  const [couponQuote, setCouponQuote] = useState<{ originalSubtotal: number; discount: number; subtotal: number; fees: number; total: number; couponCode: string } | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeResult, setCodeResult] = useState<{ valid: boolean; message: string } | null>(null);

  async function verifyPromoterCode() {
    if (verifyingCode || isSubmitting) return;
    setCodeResult(null);
    if (!promoterCode.trim()) {
      setCodeResult({ valid: false, message: 'Enter a discount coupon first.' });
      return;
    }
    setVerifyingCode(true);
    try {
      const response = await fetch('/api/checkout/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, quantity: initialQuantity, couponCode: promoterCode }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.valid) throw new Error(result.error || 'Unable to verify this code.');
      setPromoterCode(result.quote.couponCode);
      setCouponQuote(result.quote);
      setCodeResult({ valid: true, message: 'Coupon applied. Your discount is included in the order total.' });
    } catch (error) {
      setCouponQuote(null);
      setCodeResult({ valid: false, message: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Verification timed out. Please try again.' });
    } finally { setVerifyingCode(false); }
  }

  const unitPrice = event.ticket_price;
  const originalSubtotal = couponQuote?.originalSubtotal ?? unitPrice * quantity;
  const subtotal = couponQuote?.subtotal ?? originalSubtotal;
  const fees = couponQuote?.fees ?? Math.round(subtotal * 0.03);
  const total = couponQuote?.total ?? subtotal + fees;

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
    if (verifyingCode || isSubmitting) return;
    if (promoterCode.trim() && !couponQuote) {
      setCodeResult({ valid: false, message: 'Apply your coupon or remove it before paying.' });
      return;
    }
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
          quantity,
          customer_name: formData.name,
          customer_phone: formData.phone,
          eventId: event.id,
          sourceCode: referralCode || undefined,
          couponCode: couponQuote?.couponCode || undefined,
          expectedTotal: total,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize order');
      }

      const { razorpayOrder } = orderData;

      // 2. Launch Razorpay checkout
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'ARS',
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
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
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
          color: '#cbb88a',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      // Check that Razorpay is available before opening checkout
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay checkout could not load. Please reload and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during checkout');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* Left Column: Customer Form Inputs */}
      <div className="lg:col-span-7 ars-card p-6 sm:p-8 space-y-6">

        <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
          <User className="w-5 h-5 text-accent-cyan" /> Guest details
        </h3>

        {errorMsg && (
          <div role="alert" className="rounded-sm bg-red-950/60 border border-red-500/40 p-4 text-xs text-red-300 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="ars-label">Full name (matching physical ID)</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                aria-label="Full name matching photo ID" autoComplete="name" placeholder="Your full name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="ars-input !pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ars-label">Account email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  readOnly
                  required
                  aria-label="Account email" placeholder="you@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="ars-input !pl-10"
                />
              </div>
            </div>

            <div>
              <label className="ars-label">Mobile number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  aria-label="Mobile number" autoComplete="tel" placeholder="+91"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="ars-input !pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="ars-label">Date of birth</label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                aria-label="Date of birth" type="date"
                required
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="ars-input !pl-10"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-300 leading-normal">
              <input
                type="checkbox"
                required
                checked={formData.ageConfirmed}
                onChange={e => setFormData({ ...formData, ageConfirmed: e.target.checked })}
                className="mt-0.5 size-4 rounded border-border text-accent-purple focus:ring-accent-purple"
              />
              <span>
                I confirm I am at least <strong className="text-white">{event.age_limit}+ years old</strong> and agree to present a physical government ID at the entrance.
              </span>
            </label>
          </div>
        </div>

      </div>

      {/* Right Column: Order Summary & Razorpay Trigger */}
      <div className="lg:col-span-5 ars-card h-fit lg:sticky lg:top-28 space-y-6 p-6 sm:p-8">
        <div className="relative aspect-[2/1] overflow-hidden"><CatalogImage src={event.image} alt={event.name} sizes="(max-width:1024px) 100vw,40vw" className="object-cover"/></div>
        <h3 className="text-lg font-black text-white border-b border-white/10 pb-4 uppercase tracking-wide">Order summary</h3>

        <div className="space-y-3">
          <div>
            <h4 className="text-base font-black text-white">{event.name}</h4>
            <p className="text-xs text-accent-pink font-medium">
              {event.venue_name || 'Venue details to be announced'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {formatDate(event.date)} at {formatTime(event.start_time)}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-zinc-300">
            <div className="flex justify-between">
              <span>Pass tier</span>
              <span className="text-white font-semibold">General VIP Entry</span>
            </div>
            <div className="flex justify-between">
              <span>Quantity</span>
              <span className="text-white font-semibold">{quantity} Pass(es)</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket subtotal</span>
              <span className="text-white font-semibold">{formatINR(originalSubtotal)}</span>
            </div>
            {couponQuote && <div className="flex justify-between gap-3 text-emerald-300"><span>Discount ({couponQuote.couponCode})</span><span className="font-semibold">-{formatINR(couponQuote.discount)}</span></div>}
            {couponQuote && <div className="flex justify-between"><span>After discount</span><span className="text-white font-semibold">{formatINR(subtotal)}</span></div>}
            <div className="flex justify-between">
              <span>Processing fee (3%)</span>
              <span className="text-white font-semibold">{formatINR(fees)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-2xl text-white">
              <span className="font-bold uppercase">Total due</span>
              <span className="font-black">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-y border-white/10 py-5">
          <label htmlFor="promoter-code" className="ars-label">Discount coupon (optional)</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id="promoter-code" type="text" value={promoterCode} disabled={isSubmitting || verifyingCode}
              onChange={e => { setPromoterCode(e.target.value); setCodeResult(null); setCouponQuote(null); }} placeholder="Enter discount coupon"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void verifyPromoterCode(); } }}
              autoComplete="off" spellCheck={false} aria-describedby="promoter-code-help"
              className="ars-input min-w-0 flex-1" />
            <button type="button" disabled={isSubmitting || verifyingCode || !promoterCode.trim()} onClick={() => void verifyPromoterCode()} className="ars-button ars-button-secondary !px-3">{verifyingCode ? 'Checking...' : 'Apply coupon'}</button>
            {promoterCode && <button type="button" disabled={isSubmitting || verifyingCode} onClick={() => { setPromoterCode(''); setCodeResult(null); setCouponQuote(null); }} className="px-2 py-3 text-xs text-zinc-400 underline underline-offset-4">Remove</button>}
          </div>
          {codeResult && <p role="status" className={'text-xs leading-5 ' + (codeResult.valid ? 'text-emerald-300' : 'text-red-300')}>{codeResult.message}</p>}
          <p id="promoter-code-help" className="text-xs leading-5 text-zinc-400">Apply a customer coupon to see your savings before payment. One coupon per order.</p>
          {referralCode && <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-zinc-400"><span>Promoter referral attached from your link.</span><button type="button" disabled={isSubmitting || verifyingCode} onClick={() => setReferralCode('')} className="underline underline-offset-4">Remove referral</button></div>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || verifyingCode}
          className="ars-button flex w-full items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {isSubmitting ? 'Processing...' : `Pay ${formatINR(total)} securely`}
        </button>

        <div className="rounded-xl border border-white/15 px-3 py-3 text-xs text-zinc-300 flex gap-2 bg-black/20">
          <ShieldCheck className="w-4 h-4 text-accent-cyan" />
          <span>Your digital QR pass is available after verified payment. Find it anytime in My Pass.</span>
        </div>
      </div>

    </form>
  );
}
