'use client';

import { useState } from 'react';
import type { Venue } from '@/lib/types';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Settings,
  Ticket,
  UserRoundCog,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const items = [
  ['Overview', '/owner', LayoutDashboard],
  ['Events', '/owner/events', CalendarDays],
  ['Tickets', '/owner/tickets', Ticket],
  ['Customers', '/owner/customers', Users],
  ['Promoters', '/owner/promoters', Megaphone],
  ['Analytics', '/owner/analytics', BarChart3],
  ['Settlements', '/owner/settlements', CreditCard],
  ['Staff', '/owner/staff', UserRoundCog],
  ['Settings', '/owner/settings', Settings],
] as const;

export default function OwnerShell({
  children,
  venues,
  ownerName,
}: {
  children: React.ReactNode;
  venues: Venue[];
  ownerName: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get('venue') || venues[0]?.id;

  function switchVenue(id: string) {
    const next = new URLSearchParams(params);
    next.set('venue', id);
    router.push(`${pathname}?${next}`);
  }

  return (
    <div className="operations min-h-screen bg-[#070707] text-zinc-100 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden min-h-screen border-r border-white/10 bg-[#090909] p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Image src="/logo.png" alt="ARS" width={110} height={36} className="h-9 w-auto object-contain" />

        <p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-500">Venue operations</p>
        <nav className="mt-4 space-y-1">
          {items.map(([label, href, Icon]) => {
            const active = pathname === href || (href !== '/owner' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={`${href}?venue=${selected}`}
                aria-current={active ? "page" : undefined} className={`flex border-l-2 border-transparent items-center gap-3 px-3 py-2.5 text-sm ${
                  active ? 'bg-[#cbb88a]/10 text-[#e8dcc0] !border-[#cbb88a]' : 'text-zinc-500 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <form action="/api/owner/logout" method="post" className="mt-auto">
          <button className="ars-chip mt-4 flex w-full items-center justify-center gap-3 px-3 text-sm text-zinc-300">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-white/10 bg-[#070707]/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-500">Venue</p>
            <select
              aria-label="Active venue"
              value={selected}
              onChange={(e) => switchVenue(e.target.value)}
              className="ars-select"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="text-sm font-semibold">{ownerName}</p>
            <form action="/api/owner/logout" method="post" className="lg:hidden">
              <button className="mt-2 text-xs text-zinc-400">Sign out</button>
            </form>
          </div>
        </header>

        <main className="ars-page-shell max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#090909]/98 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.slice(0, 4).map(([label, href, Icon]) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={`${href}?venue=${selected}`}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${
                isActive ? 'text-[#d8c79e]' : 'text-zinc-500'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} aria-controls="owner-more" className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] text-zinc-300"><MoreHorizontal size={18}/>More</button>
        {moreOpen && <div id="owner-more" className="absolute inset-x-0 bottom-full border-t border-white/15 bg-[#111110] p-4 shadow-2xl"><p className="eyebrow mb-3">More operations</p>{items.slice(4).map(([label,href,Icon]) => <Link onClick={() => setMoreOpen(false)} key={href} href={`${href}?venue=${selected}`} className="flex items-center gap-3 border-b border-white/10 px-3 py-4 text-sm"><Icon size={18}/>{label}</Link>)}</div>}
      </nav>
    </div>
  );
}
