'use client';

import {
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import Link from '@/components/FastLink';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLinkStatus } from 'next/link';

function ModulePending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 border-b-2 border-[#cbb88a] bg-[#17150f] text-[#e8dcc0]"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#cbb88a] motion-safe:animate-pulse"/>Opening...</span>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview Analytics', href: '/admin', icon: BarChart3 },
    { label: 'Venue Performance', href: '/admin/performance', icon: BarChart3 },
    { label: 'Compare Venues', href: '/admin/compare', icon: Building2 },
    { label: 'Venues & Commission', href: '/admin/venues', icon: Building2 },
    { label: 'Events & Pricing', href: '/admin/events', icon: Calendar },
    { label: 'Tickets & Orders', href: '/admin/tickets', icon: Ticket },
    { label: 'Promoter Attribution', href: '/admin/promoters', icon: Zap },
    { label: 'Customer Coupons', href: '/admin/coupons', icon: Ticket },
    { label: 'Club Settlements', href: '/admin/settlements', icon: DollarSign },
    { label: 'Customer CRM', href: '/admin/customers', icon: Users },
    { label: 'Marketing', href: '/admin/marketing', icon: Zap },
    { label: 'Login Activity', href: '/admin/login-activity', icon: Users },
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
          <form action="/api/admin/logout" method="post">
            <button className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-zinc-300">Sign out</button>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/admin/performance' && pathname.startsWith('/admin/performance/'));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                scroll={false}
                aria-current={isActive ? "page" : undefined} className={`relative flex-shrink-0 border-b-2 border-transparent px-4 py-4 text-xs uppercase tracking-wide ${
                  isActive
                    ? 'bg-[#cbb88a]/10 text-[#e8dcc0] !border-[#cbb88a]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{item.label}</span>
                <ModulePending/>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
