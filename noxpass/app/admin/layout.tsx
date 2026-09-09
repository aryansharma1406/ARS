'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, Building2, Calendar, Ticket, Zap, 
  DollarSign, Users, Download, ShieldCheck, QrCode 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview Analytics', href: '/admin', icon: BarChart3 },
    { label: 'Venues & Commission', href: '/admin/venues', icon: Building2 },
    { label: 'Events & Pricing', href: '/admin/events', icon: Calendar },
    { label: 'Tickets & Orders', href: '/admin/tickets', icon: Ticket },
    { label: 'Promoter Attribution', href: '/admin/promoters', icon: Zap },
    { label: 'Club Settlements', href: '/admin/settlements', icon: DollarSign },
    { label: 'Customer CRM', href: '/admin/customers', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between glass-panel p-6 rounded-3xl border border-border gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-accent-purple" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-accent-purple uppercase tracking-widest block">NoxPass Nightlife Portal</span>
            <h1 className="text-2xl font-black text-white">Partner Admin & Commission Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/scanner"
            className="px-4 py-2.5 rounded-xl bg-surface border border-border text-xs font-semibold text-accent-cyan hover:text-white hover:bg-surface-hover transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Staff Door Portal
          </Link>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/60">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20'
                  : 'bg-surface/60 text-gray-400 hover:text-white hover:bg-surface border border-border/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main Admin View Content */}
      <div className="space-y-6">{children}</div>

    </div>
  );
}
