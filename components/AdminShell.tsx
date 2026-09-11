'use client';

import {
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  QrCode,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview Analytics', href: '/admin', icon: BarChart3 },
    { label: 'Venues & Commission', href: '/admin/venues', icon: Building2 },
    { label: 'Events & Pricing', href: '/admin/events', icon: Calendar },
    { label: 'Tickets & Orders', href: '/admin/tickets', icon: Ticket },
    { label: 'Promoter Attribution', href: '/admin/promoters', icon: Zap },
    { label: 'Customer Coupons', href: '/admin/coupons', icon: Ticket },
    { label: 'Club Settlements', href: '/admin/settlements', icon: DollarSign },
    { label: 'Customer CRM', href: '/admin/customers', icon: Users },
  ];

  return (
    <div className="operations ars-page-shell px-4 py-8 space-y-7 sm:px-8">
      <div className="flex flex-col gap-4 rounded-sm border border-white/10 bg-[#090909] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/ars-logo.svg" alt="ARS Hospitality" width={240} height={100} className="h-10 w-24 shrink-0 object-contain" />
          <div>
            <span className="text-[10px] font-bold text-accent-pink uppercase tracking-widest block">ARS / Internal operations</span>
            <h1 className="text-2xl font-black uppercase text-white">Command center</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/scanner"
            className="ars-button ars-button-secondary !min-h-10 !px-4"
          >
            <QrCode className="w-4 h-4" /> Staff scanner
          </Link>
          <form action="/api/admin/logout" method="post">
            <button className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-zinc-300">Sign out</button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined} className={`flex-shrink-0 border-b-2 border-transparent px-4 py-4 text-xs uppercase tracking-wide ${
                  isActive
                    ? 'bg-[#cbb88a]/10 text-[#e8dcc0] !border-[#cbb88a]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
