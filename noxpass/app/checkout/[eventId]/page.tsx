import React from 'react';
import { notFound } from 'next/navigation';
import { getEventById } from '@/lib/store';
import CheckoutForm from '@/components/CheckoutForm';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

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

  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }

  const quantity = Math.max(1, parseInt(qty || '1', 10));

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
        <h1 className="text-3xl font-display font-black text-white">
          Secure Ticket Checkout
        </h1>
        <p className="text-xs text-gray-400">
          Enter customer details for instant digital QR pass generation.
        </p>
      </div>

      <CheckoutForm 
        event={event} 
        initialQuantity={quantity} 
        sourceCode={sourceCode} 
      />

    </div>
  );
}
