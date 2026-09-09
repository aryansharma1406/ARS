import CheckoutForm from '@/components/CheckoutForm';
import { requirePage,requireRole } from '@/lib/auth';
import { getEventById } from '@/lib/store';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface CheckoutPageProps {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    qty?: string;
    source?: string;
  }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { eventId } = await params;
  const { qty, source: sourceCode } = await searchParams;

  const customer = await requirePage(()=>requireRole('customer'), '/login', `/checkout/${eventId}?qty=${encodeURIComponent(qty||'1')}&source=${encodeURIComponent(sourceCode||'')}`);
  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }

  const quantity = Math.min(10, Math.max(1, parseInt(qty || '1', 10) || 1));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top back */}
      <div>
        <Link 
          href={`/events/${event.id}${sourceCode ? `?source=${sourceCode}` : ''}`} 
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Event
        </Link>
      </div>

      <div className="space-y-2">
        <p className="eyebrow">Your night is almost set</p>
        <h1 className="text-4xl sm:text-5xl font-display font-black uppercase text-white">
          Secure checkout
        </h1>
        <p className="text-xs text-gray-400">
          Your ARS pass is issued immediately after verified payment.
        </p>
      </div>

      <CheckoutForm 
        event={event}
        accountEmail={customer.email} 
        initialQuantity={quantity} 
        sourceCode={sourceCode} 
      />

    </div>
  );
}
