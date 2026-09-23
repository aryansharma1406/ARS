import FunnelObservation from '@/components/FunnelObservation';
import CheckoutForm from '@/components/CheckoutForm';
import {getEventPassTiers} from '@/lib/event-pass-tiers';
import { requirePage,requireRole } from '@/lib/auth';
import { getEventById } from '@/lib/store';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

interface CheckoutPageProps {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    qty?: string;
    tier?: string;
    source?: string;
  }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { eventId } = await params;
  const { qty, tier, source: sourceCode } = await searchParams;

  const customer = await requirePage(()=>requireRole('customer'), '/login', `/checkout/${eventId}?qty=${encodeURIComponent(qty||'1')}&tier=${encodeURIComponent(tier||'')}&source=${encodeURIComponent(sourceCode||'')}`);
  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }
  const referralCode = sourceCode || (await cookies()).get('ars_ref_' + event.venue_id)?.value;

  const quantity = Math.min(10, Math.max(1, parseInt(qty || '1', 10) || 1));
  const tiers = await getEventPassTiers(event.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Link
          href={`/events/${event.id}${referralCode ? `?source=${encodeURIComponent(referralCode)}` : ''}`}
          className="ars-button ars-button-secondary inline-flex w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to event
        </Link>
      </div>

      <section className="space-y-2">
        <p className="eyebrow">Your night is almost set</p>
        <h1 className="text-4xl sm:text-5xl font-black uppercase text-white">Secure checkout</h1>
        <p className="text-sm text-zinc-400">Pay by UPI and submit your reference. Your ARS pass is issued only after manual payment verification.</p>
      </section>

      <div className="flex flex-wrap gap-6 border-y border-white/10 py-5 text-[10px] font-bold uppercase tracking-[.15em] text-zinc-400"><span>01 / Review your access</span><span>02 / Secure checkout</span><span>03 / Digital QR pass</span></div>
      <FunnelObservation eventId={event.id} kind="checkout_start" source={referralCode}/>
      <CheckoutForm key={event.id} event={event} tiers={tiers} initialTierId={tier} accountEmail={customer.email} accountPhone={customer.phone} initialQuantity={quantity} sourceCode={referralCode} />
    </div>
  );
}
