'use client';

import { Menu, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/#venues', label: 'Venues' },
  { href: '/account/tickets', label: 'My Pass' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navClass = 'nav-link text-xs font-medium uppercase tracking-[.13em] text-zinc-400 hover:text-zinc-100 transition-colors';

  return (
    <header className={`ars-nav sticky top-0 z-50 border-b border-white/10 ${pathname === '/' ? 'bg-black/65 -mb-[74px]' : 'bg-black/95'}`}>
      <div className="ars-page-shell flex h-[74px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="ARS home" className="flex items-center">
          <Image src="/logo.png" alt="ARS" width={150} height={49} priority className="h-10 w-auto object-contain" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-9 md:flex">
          {links.map((link) => <Link key={link.label} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={navClass}>{link.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-7 md:flex">
          <Link href="/account/tickets" aria-label="Account" className={`${navClass} flex min-h-11 items-center gap-2`}><UserRound size={17} strokeWidth={1.5}/><span>Account</span></Link>
        </div>

        <button onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation" className="flex min-h-11 min-w-11 items-center justify-center border border-white/15 text-white md:hidden">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-white/10 bg-black/95 px-4 pb-6 pt-3 backdrop-blur-xl md:hidden">
          {[...links, { href: '/account/tickets', label: 'Account' }].map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between border-b border-white/10 text-sm font-medium uppercase tracking-[.12em] text-zinc-200">
              {link.label}<span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
