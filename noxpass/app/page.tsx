import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sparkles, Ticket, ShieldCheck, MapPin, Zap, Flame, 
  CheckCircle2, ArrowRight, QrCode, Building2, Users, Star, Music, Award
} from 'lucide-react';
import EventCard from '@/components/EventCard';
import { getEvents, getVenues } from '@/lib/store';

export default async function HomePage() {
  const events = await getEvents();
  const venues = await getVenues();

  const featuredVenue = venues[0] || {
    name: "Club Xtreme",
    location: "Goa",
    address: "Tito's Lane, Baga, Calangute, Goa 403516",
    description: "Goa's premier high-energy superclub featuring world-class acoustic systems and laser matrix ceilings.",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop"
  };

  return (
    <div className="space-y-24 pb-12">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 lg:pt-20 pb-20 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-hero-gradient pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-accent-purple/30 text-xs font-semibold text-accent-purple mb-8 animate-pulse">
            <Flame className="w-4 h-4 text-accent-pink" />
            Launch Partner: Club Xtreme, Tito&apos;s Lane, Goa
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
            THE VIP GATEWAY TO <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple via-accent-pink to-accent-cyan text-glow-purple">
              GOA&apos;S NIGHTLIFE RAVES
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Skip the club door queue. Secure instant digital QR entry tickets for <strong className="text-white">Club Xtreme Tito&apos;s Lane</strong> and top Goa venues directly on your phone.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/events"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-accent-purple via-accent-pink to-accent-cyan hover:opacity-95 shadow-xl shadow-accent-purple/30 transition-all flex items-center justify-center gap-3 group"
            >
              <Ticket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Explore Events
            </Link>

            <Link
              href="/events?venue=Club+Xtreme"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-base text-gray-200 glass-panel hover:text-white hover:border-accent-cyan/50 transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5 text-accent-cyan" />
              Club Xtreme Goa
            </Link>
          </div>

          {/* Live Trust Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-border/40">
            <div className="p-4 rounded-2xl glass-card text-center">
              <span className="block text-2xl sm:text-3xl font-black text-white">100%</span>
              <span className="text-xs text-gray-400 font-medium">Guaranteed VIP Entry</span>
            </div>
            <div className="p-4 rounded-2xl glass-card text-center">
              <span className="block text-2xl sm:text-3xl font-black text-accent-pink">&lt; 30 sec</span>
              <span className="text-xs text-gray-400 font-medium">Instant QR Delivery</span>
            </div>
            <div className="p-4 rounded-2xl glass-card text-center">
              <span className="block text-2xl sm:text-3xl font-black text-accent-cyan">₹20K+</span>
              <span className="text-xs text-gray-400 font-medium">Promoter Payouts</span>
            </div>
            <div className="p-4 rounded-2xl glass-card text-center">
              <span className="block text-2xl sm:text-3xl font-black text-accent-emerald">5,000+</span>
              <span className="text-xs text-gray-400 font-medium">Scanned Door Entries</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. TONIGHT'S & UPCOMING EVENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-pink uppercase tracking-widest mb-1">
              <Zap className="w-4 h-4 fill-accent-pink" /> Tonight & Weekend Lineup
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Trending Events in Goa
            </h2>
          </div>
          <Link 
            href="/events"
            className="text-sm font-semibold text-accent-cyan hover:text-white flex items-center gap-1 transition-colors"
          >
            View All Events ({events.length}) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map(evt => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </div>
      </section>

      {/* 3. FEATURED VENUE HIGHLIGHT: CLUB XTREME GOA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-accent-purple/30 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Image Col */}
            <div className="lg:col-span-5 relative h-72 lg:h-96 rounded-2xl overflow-hidden border border-border">
              <Image
                src={featuredVenue.image}
                alt={featuredVenue.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full border border-border text-xs font-bold text-accent-pink">
                ★ Anchor Partner Venue
              </div>
            </div>

            {/* Content Col */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold text-accent-cyan uppercase tracking-widest block mb-1">
                  Premier Nightclub Spotlight
                </span>
                <h3 className="text-3xl sm:text-4xl font-display font-black text-white">
                  {featuredVenue.name}
                </h3>
                <p className="text-sm text-accent-purple font-semibold flex items-center gap-1.5 mt-1">
                  <MapPin className="w-4 h-4" /> {featuredVenue.address}
                </p>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                {featuredVenue.description} Equipped with digital ticket door scanners, multi-tiered promoter link tracking, and transparent settlement reporting for management.
              </p>

              {/* Highlights pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface/80 border border-border text-xs">
                  <span className="block text-gray-400">Door System</span>
                  <strong className="text-white">QR Door Scanner</strong>
                </div>
                <div className="p-3 rounded-xl bg-surface/80 border border-border text-xs">
                  <span className="block text-gray-400">Platform Share</span>
                  <strong className="text-accent-pink">{featuredVenue.commission_percentage}% Commission</strong>
                </div>
                <div className="p-3 rounded-xl bg-surface/80 border border-border text-xs">
                  <span className="block text-gray-400">Attribution</span>
                  <strong className="text-accent-cyan">Source Tracking</strong>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/events?venue=Club+Xtreme"
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all shadow-md shadow-accent-purple/20"
                >
                  Book Club Xtreme Pass
                </Link>
                <Link
                  href="/staff/scanner"
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-300 bg-surface hover:text-white border border-border transition-colors flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-accent-cyan" /> Door Scanner Portal
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-accent-purple uppercase tracking-widest">Seamless Flow</span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mt-1">
            From Social Link to Club Entry in 4 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="glass-card p-6 rounded-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center font-bold text-xl text-accent-purple mb-4">
              01
            </div>
            <h4 className="text-base font-bold text-white mb-2">Discover Event</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Click a promoter link (e.g. <code className="text-accent-pink bg-surface px-1 py-0.5 rounded">source=XYZ-ARYAN</code>) or explore Goa nightlife line-ups.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-accent-pink/20 border border-accent-pink/40 flex items-center justify-center font-bold text-xl text-accent-pink mb-4">
              02
            </div>
            <h4 className="text-base font-bold text-white mb-2">Razorpay Checkout</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pay via UPI, GPay, Paytm, or Credit Card with 256-bit server verified security.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center font-bold text-xl text-accent-cyan mb-4">
              03
            </div>
            <h4 className="text-base font-bold text-white mb-2">Instant Digital Pass</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Get an encrypted QR ticket with unique ID, status tracking, and download link.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-accent-emerald/20 border border-accent-emerald/40 flex items-center justify-center font-bold text-xl text-accent-emerald mb-4">
              04
            </div>
            <h4 className="text-base font-bold text-white mb-2">Door Scan & Entry</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Show QR code to Club Xtreme bouncer scanner. Status changes to <span className="text-accent-emerald font-bold">USED</span> instantly.
            </p>
          </div>

        </div>
      </section>

      {/* 5. WHY BOOK THROUGH US */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-accent-purple" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">Guaranteed Club Entry</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  No last-minute door cancellations or inflated cash cover charges at Tito&apos;s Lane.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-accent-cyan" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">Promoter Attribution</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Support your favorite Goa hosts. Full referral tracking ensures exact commission payouts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-pink/10 border border-accent-pink/30 flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-accent-pink" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">Transparent Payouts</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Automated settlement reports for club managers detailing gross ticket revenue and net venue share.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PROMOTER LINK CALLOUT DEMO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-accent-purple/20 via-surface to-accent-cyan/20 border border-border text-center space-y-4">
          <span className="text-xs font-bold text-accent-pink uppercase tracking-wider">
            Promoter & Influencer Network
          </span>
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Testing Source Code Tracking?
          </h3>
          <p className="text-sm text-gray-300 max-w-xl mx-auto">
            Try accessing an event using promoter <strong className="text-accent-cyan">XYZ-ARYAN</strong>&apos;s referral link to test real-time commission tracking in the admin dashboard!
          </p>
          <div className="pt-2">
            <Link
              href="/events/evt-xtreme-neon-01?source=XYZ-ARYAN"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-accent-purple hover:bg-accent-purple/80 transition-colors shadow-lg"
            >
              Test Link: /events/evt-xtreme-neon-01?source=XYZ-ARYAN <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
