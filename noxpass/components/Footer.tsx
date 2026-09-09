import React from 'react';
import Link from 'next/link';
import { Sparkles, MapPin, ShieldCheck, QrCode, Instagram, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border/80 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-purple to-accent-pink p-[1.5px]">
                <div className="w-full h-full bg-surface rounded-[6px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                </div>
              </div>
              <span className="font-display font-black text-xl text-white tracking-wider">
                NOX<span className="text-accent-pink">PASS</span>
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              India&apos;s leading nightlife ticketing infrastructure. Discover VIP club events, instant QR pass entry, and seamless promoter attribution.
            </p>
            <div className="flex items-center gap-3 pt-2 text-gray-400">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-accent-pink transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:vip@noxpass.com" className="hover:text-accent-cyan transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="tel:+919876543210" className="hover:text-accent-purple transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Col 2: Featured Venue */}
          <div>
            <h4 className="text-xs font-bold text-gray-200 tracking-wider uppercase mb-4">
              Featured Launch Venue
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="font-semibold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent-pink" /> Club Xtreme, Tito&apos;s Lane
              </li>
              <li>Baga, Calangute, Goa 403516</li>
              <li>Capacity: 500+ Partygoers</li>
              <li>VIP Booths & Laser Matrix</li>
              <li className="pt-2">
                <Link href="/events?venue=Club+Xtreme" className="text-accent-cyan hover:underline font-medium">
                  View Club Xtreme Events &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-gray-200 tracking-wider uppercase mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="/events" className="hover:text-white transition-colors">Tonight&apos;s Events</Link></li>
              <li><Link href="/events?category=Techno" className="hover:text-white transition-colors">Underground Techno</Link></li>
              <li><Link href="/events?category=Bollywood" className="hover:text-white transition-colors">Bollywood Nights</Link></li>
              <li><Link href="/staff/scanner" className="hover:text-accent-cyan transition-colors flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> Staff Door Portal</Link></li>
              <li><Link href="/admin" className="hover:text-accent-purple transition-colors flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Partner Admin Panel</Link></li>
            </ul>
          </div>

          {/* Col 4: Trust & Verification */}
          <div>
            <h4 className="text-xs font-bold text-gray-200 tracking-wider uppercase mb-4">
              Secure Ticketing
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              All tickets are cryptographically signed with unique non-reusable QR codes. Razorpay 256-bit server verified checkout.
            </p>
            <div className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-accent-emerald flex-shrink-0" />
              <div className="text-[11px]">
                <span className="block font-bold text-white">Razorpay Verified</span>
                <span className="text-gray-400">Instant UPI, Cards & NetBanking</span>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} NoxPass Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-400 cursor-pointer">Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
