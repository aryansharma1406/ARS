'use client';

import { Event } from '@/lib/types';
import PassTierChoices from '@/components/PassTierChoices';
import {availableTier,type PassTier} from '@/lib/pass-tiers';
import { formatDate,formatTime } from '@/lib/utils';
import {
AlertCircle,
Calendar as CalendarIcon,
CreditCard,
Mail,
Minus,
Phone,
Plus,
ShieldCheck,
Ticket,
User
} from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import { useRouter } from 'next/navigation';
import React,{ useEffect,useState } from 'react';

interface CheckoutFormProps {
  event: Event;
  tiers: PassTier[];
  initialTierId?: string;
  accountEmail: string;
  accountPhone?: string;
  initialQuantity: number;
  sourceCode?: string;
  testPayment?: boolean;
}

const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(amount);

export default function CheckoutForm({ event, tiers, initialTierId, initialQuantity, sourceCode, accountEmail, accountPhone = '', testPayment = false }: CheckoutFormProps) {
  const router = useRouter();
  const [tierId,setTierId]=useState(()=>tiers.some(t=>t.id===initialTierId)?initialTierId!:tiers.find(t=>availableTier(t,Date.now()))?.id||tiers[0]?.id||'');
  const selectedTier=tiers.find(t=>t.id===tierId);

  const [formData, setFormData] = useState({
    name: '',
    email: accountEmail,
    phone: accountPhone,
    dob: '',
    ageConfirmed: false,
  });

  const [quantity, setQuantity] = useState(Math.min(10, Math.max(1, initialQuantity)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [promoterCode, setPromoterCode] = useState('');
  const [referralCode, setReferralCode] = useState(sourceCode || '');
  const [couponQuote, setCouponQuote] = useState<{ originalSubtotal: number; discount: number; subtotal: number; fees: number; total: number; couponCode: string } | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeResult, setCodeResult] = useState<{ valid: boolean; message: string } | null>(null);

  async function verifyPromoterCode(nextQuantity = quantity) {
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
        body: JSON.stringify({ eventId: event.id, tierId, quantity: nextQuantity, couponCode: promoterCode }),
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

  function changeQuantity(nextQuantity: number) {
    if (isSubmitting || verifyingCode || nextQuantity < 1 || nextQuantity > Math.min(10,selectedTier?.available||0)) return;
    setQuantity(nextQuantity);
    setErrorMsg('');
    setCouponQuote(null);
    setCodeResult(null);
    if (promoterCode.trim()) void verifyPromoterCode(nextQuantity);
  }

  const unitPrice = selectedTier?.price || 0;
  const originalSubtotal = couponQuote?.originalSubtotal ?? unitPrice * quantity;
  const subtotal = couponQuote?.subtotal ?? originalSubtotal;
  const fees = couponQuote?.fees ?? Math.round(subtotal * 0.03);
  const total = couponQuote?.total ?? subtotal + fees;

  // Load Razorpay script dynamically
  useEffect(() => {
    if (testPayment) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [testPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingCode || isSubmitting) return;
    if(!selectedTier||!availableTier(selectedTier,Date.now())||quantity>selectedTier.available){setErrorMsg('Choose an available pass and quantity.');return;}
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
          tierId,
          sourceCode: referralCode || undefined,
          couponCode: couponQuote?.couponCode || undefined,
          expectedTotal: total,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize order');
      }

      if (orderData.testPayment) {
        if (!orderData.tickets?.length) throw new Error('Test booking did not return tickets. Check My Pass before trying again.');
        router.push(`/ticket/${orderData.tickets[0].id}`);
        return;
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start lg:grid-cols-12 gap-6 lg:gap-8">

      {/* Left Column: Customer Form Inputs */}
      <div className="lg:col-span-7 ars-card p-6 sm:p-8 space-y-6 !border-white/10">

        <div className="border-b border-white/10 pb-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#cbb88a]">01 / Booking details</p>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <User className="w-5 h-5 text-[#cbb88a]" /> Lead guest
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Enter the booking holder&apos;s details as shown on their government ID.</p>
        </div>

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
              <label className="ars-label">Account email (optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  readOnly
                  aria-label="Account email (optional)" placeholder="No email added"
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

        <div className="flex gap-3 border-t border-white/10 pt-5 text-xs leading-6 text-zinc-400">
          <Ticket className="mt-1 h-4 w-4 shrink-0 text-[#cbb88a]" />
          <p>{quantity === 1 ? 'One digital entry pass' : `${quantity} digital entry passes`} will be issued after payment. Every guest must meet the event&apos;s age requirement and carry a valid government ID.</p>
        </div>
      </div>

      {/* Right Column: Order Summary & Razorpay Trigger */}
      <div className="lg:col-span-5 ars-card h-fit space-y-5 p-5 sm:p-7 !border-[#cbb88a]/25 !bg-gradient-to-b from-[#cbb88a]/[0.06] to-transparent">
        <div className="border-b border-white/10 pb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#cbb88a]">02 / Your reservation</p>
          <h3 className="text-xl font-bold text-white">Order summary</h3>
        </div>

        <div className="space-y-3">
          <PassTierChoices tiers={tiers} selected={tierId} disabled={isSubmitting||verifyingCode} onChange={id=>{setTierId(id);setQuantity(1);setCouponQuote(null);setCodeResult(null);setErrorMsg('');}}/>
          <div className="flex items-center gap-4 pb-2">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-white/10"><CatalogImage src={event.image} alt={event.name} sizes="80px" className="object-cover"/></div>
            <div className="min-w-0">
            <h4 className="text-base font-black text-white">{event.name}</h4>
            <p className="text-xs text-accent-pink font-medium">
              {event.venue_name || 'Venue details to be announced'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {formatDate(event.date)} at {formatTime(event.start_time)}
            </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4 text-sm text-zinc-300">
            <div className="flex justify-between">
              <span>Pass tier</span>
              <span className="text-white font-semibold">{selectedTier?.name||'Choose a pass'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/20 p-3">
              <div><span className="font-medium text-white">Tickets</span><p className="mt-1 text-xs text-zinc-400">{formatINR(unitPrice)} each</p></div>
              <div className="flex items-center rounded-sm border border-[#cbb88a]/30" role="group" aria-label="Ticket quantity">
                <button type="button" aria-label="Remove one ticket" disabled={quantity <= 1 || isSubmitting || verifyingCode} onClick={() => changeQuantity(quantity - 1)} className="flex h-11 w-11 items-center justify-center text-[#cbb88a] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbb88a] disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <output aria-live="polite" aria-label="Number of tickets" className="w-9 text-center font-semibold tabular-nums text-white">{quantity}</output>
                <button type="button" aria-label="Add one ticket" disabled={quantity >= 10 || isSubmitting || verifyingCode} onClick={() => changeQuantity(quantity + 1)} className="flex h-11 w-11 items-center justify-center text-[#cbb88a] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbb88a] disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="!mt-2 text-xs text-zinc-500">Up to 10 tickets per booking. Subject to availability.</p>
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
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pt-4 text-white">
              <span className="font-semibold">Total due</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight">{verifyingCode ? 'Updating...' : formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-y border-white/10 py-5">
          <label htmlFor="promoter-code" className="ars-label">Discount coupon (optional)</label>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <input id="promoter-code" type="text" value={promoterCode} disabled={isSubmitting || verifyingCode}
              onChange={e => { setPromoterCode(e.target.value); setCodeResult(null); setCouponQuote(null); }} placeholder="Enter discount coupon"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void verifyPromoterCode(); } }}
              autoComplete="off" spellCheck={false} aria-describedby="promoter-code-help"
              className="ars-input min-w-0 flex-1" />
            <button type="button" disabled={isSubmitting || verifyingCode || !promoterCode.trim()} onClick={() => void verifyPromoterCode()} className="ars-button ars-button-secondary !px-4 !tracking-wide">{verifyingCode ? 'Checking...' : 'Apply'}</button>
          </div>
          {promoterCode && <button type="button" disabled={isSubmitting || verifyingCode} onClick={() => { setPromoterCode(''); setCodeResult(null); setCouponQuote(null); }} className="text-xs text-zinc-400 underline underline-offset-4">Remove coupon</button>}
          {codeResult && <p role="status" className={'text-xs leading-5 ' + (codeResult.valid ? 'text-emerald-300' : 'text-red-300')}>{codeResult.message}</p>}
          <p id="promoter-code-help" className="text-xs leading-5 text-zinc-400">Apply a customer coupon to see your savings before payment. One coupon per order.</p>
          {referralCode && <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-zinc-400"><span>Promoter referral attached from your link.</span><button type="button" disabled={isSubmitting || verifyingCode} onClick={() => setReferralCode('')} className="underline underline-offset-4">Remove referral</button></div>}
        </div>

        {testPayment && <div role="status" className="border border-amber-400/30 bg-amber-400/10 p-4 text-xs leading-6 text-amber-200"><strong className="block">Test checkout · No money will be charged</strong>This creates a paid test order and valid QR passes in the connected database. Ticket availability, revenue and commission reports will include this booking.</div>}

        <button
          type="submit"
          disabled={isSubmitting || verifyingCode}
          className="ars-button flex w-full items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {isSubmitting ? 'Processing...' : testPayment ? 'Complete test booking' : `Pay ${formatINR(total)} securely`}
        </button>

        <div className="rounded-xl border border-white/15 px-3 py-3 text-xs text-zinc-300 flex gap-2 bg-black/20">
          <ShieldCheck className="w-4 h-4 text-accent-cyan" />
          <span>Your digital QR pass is available after verified payment. Find it anytime in My Pass.</span>
        </div>
      </div>

    </form>
  );
}
