'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ticket, Sparkles, QrCode, ShieldCheck, Menu, X, Building2 } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-purple via-accent-pink to-accent-cyan p-[2px] transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-purple animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-display font-black text-2xl tracking-wider text-white">
                NOX<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-accent-pink">PASS</span>
              </span>
              <span className="block text-[10px] font-medium tracking-widest text-accent-cyan/80 uppercase -mt-1">
                Goa Nightlife Passes
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/events" className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2">
              <Ticket className="w-4 h-4 text-accent-pink" />
              Events
            </Link>
            <Link href="/events?venue=Club+Xtreme" className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent-cyan" />
              Venues
            </Link>
            <button 
              onClick={() => setPartnerModalOpen(true)}
              className="text-sm font-medium text-gray-300 hover:text-accent-purple transition-colors"
            >
              Partner With Us
            </button>
          </nav>

          {/* Desktop Quick Tools */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/staff/scanner"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 text-xs font-semibold text-gray-300 hover:text-white hover:border-accent-cyan/50 hover:bg-accent-cyan/10 transition-all"
            >
              <QrCode className="w-4 h-4 text-accent-cyan" />
              Door Scanner
            </Link>

            <Link 
              href="/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 text-xs font-semibold text-gray-300 hover:text-white hover:border-accent-purple/50 hover:bg-accent-purple/10 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-accent-purple" />
              Admin
            </Link>

            <Link
              href="/events"
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 shadow-lg shadow-accent-purple/20 transition-all"
            >
              Explore Events
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-border px-4 pt-4 pb-6 space-y-4">
            <Link 
              href="/events" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-gray-200 hover:text-white"
            >
              🎉 Browse Events
            </Link>
            <Link 
              href="/events?venue=Club+Xtreme" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-gray-200 hover:text-white"
            >
              🍸 Club Xtreme Goa & Venues
            </Link>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                setPartnerModalOpen(true);
              }}
              className="block text-base font-medium text-accent-purple"
            >
              🤝 Partner With Us (Club Onboarding)
            </button>
            <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
              <Link 
                href="/staff/scanner"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-accent-cyan"
              >
                <QrCode className="w-4 h-4" /> Staff Scanner
              </Link>
              <Link 
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-accent-purple"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Partner Modal */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-border relative">
            <button 
              onClick={() => setPartnerModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center border border-accent-purple/40">
                <Building2 className="w-5 h-5 text-accent-purple" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Partner Your Venue</h3>
                <p className="text-xs text-gray-400">Join Club Xtreme and top Goa nightclubs on NoxPass</p>
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-6">
              Sell entry tickets online, eliminate door queue friction, track promoter referral links (e.g. <code className="text-accent-cyan bg-surface px-1.5 py-0.5 rounded">XYZ-ARYAN</code>), and receive instant weekly payouts with flexible commission rates.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Thank you! Our Goa nightlife onboarding manager will contact you within 24 hours.');
              setPartnerModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Club / Venue Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Club Xtreme, Tito's Lane" 
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Contact Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Manager / Owner" 
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Mobile / WhatsApp</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+91 98765 43210" 
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-purple"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 transition-all shadow-lg shadow-accent-purple/20"
              >
                Submit Onboarding Request
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
