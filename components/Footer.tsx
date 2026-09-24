import Image from 'next/image';
import Link from 'next/link';
import {policies} from '@/lib/legal-policies';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return <footer className="hospitality-footer"><div className="ars-section">
    <div className="footer-top"><Link href="/" aria-label="ARS home"><Image src="/ars-logo.svg" alt="ARS Hospitality" width={240} height={100} className="h-16 w-auto"/></Link><p>After dark.<br/><em>Beyond ordinary.</em></p><Link href="/events" className="editorial-link">Find your next night <ArrowUpRight size={17}/></Link></div>
    <div className="footer-columns"><p className="footer-manifesto">Exceptional spaces.<br/>Unforgettable company.<br/>Only ARS.</p><div><p className="eyebrow">Discover</p><Link href="/events">All events</Link><Link href="/#venues">Our venues</Link><Link href="/events?category=Techno">Electronic</Link><Link href="/events?category=Bollywood">Bollywood</Link></div><div><p className="eyebrow">Your experience</p><Link href="/account/tickets">My Pass</Link><Link href="/account/profile">Your account</Link><a href="mailto:hello@ars.events">Get in touch</a></div><div><p className="eyebrow">Behind the night</p><Link href="/partner">Partner with ARS</Link><Link href="/owner/login">Owner login</Link><Link href="/staff/scanner">Door operations</Link></div></div>
    <nav aria-label="Legal and policies" className="border-t border-white/15 py-6"><Link href="/legal" className="eyebrow inline-flex min-h-11 items-center">Legal &amp; Policies</Link><div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">{policies.map(policy=><Link key={policy.slug} href={`/legal/${policy.slug}`} className="py-2 text-sm text-zinc-400 hover:text-[#e2d4ae]">{policy.title}</Link>)}</div><p className="mt-3 text-xs text-zinc-500">Draft website policies. Legal review required before public launch.</p></nav>
    <div className="footer-bottom"><p>© {new Date().getFullYear()} ARS Hospitality. All rights reserved.</p><a href="mailto:hello@ars.events">hello@ars.events <ArrowUpRight size={13}/></a><span>Nightlife, considered.</span></div>
  </div></footer>;
}
