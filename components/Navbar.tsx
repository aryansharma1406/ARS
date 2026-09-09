'use client';

import { Menu,X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/events?venue=Club+Xtreme', label: 'Venues' },
  { href: '/account/tickets', label: 'My Pass' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="ARS home" className="flex items-center">
          <Image src="/logo.png" alt="ARS" width={150} height={49} priority className="h-10 w-auto object-contain" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-9 md:flex">
          {links.map((link) => <Link key={link.label} href={link.href} className="text-xs font-bold uppercase tracking-[.14em] text-zinc-400 transition-colors hover:text-white">{link.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/staff/scanner" className="px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-zinc-500 transition hover:text-white">Staff</Link>
          <Link href="/owner/login" className="ars-button !min-h-10 !px-5">Partner portal</Link>
        </div>

        <button onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} className="flex min-h-11 min-w-11 items-center justify-center border border-white/15 text-white md:hidden">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-white/10 bg-black px-4 pb-6 pt-3 md:hidden">
          {[...links, { href: '/staff/scanner', label: 'Staff scanner' }, { href: '/owner/login', label: 'Partner portal' }].map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between border-b border-white/10 text-sm font-bold uppercase tracking-[.12em] text-zinc-200">
              {link.label}<span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
