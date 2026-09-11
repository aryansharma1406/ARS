import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/80">
      <div className="ars-page-shell grid gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" aria-label="ARS home" className="inline-flex transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cbb88a]">
            <Image src="/ars-logo.svg" alt="ARS Hospitality" width={240} height={100} className="h-16 w-auto object-contain" />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-500">Curated nights. Secure access. One unmistakable pass.</p>
        </div>
        <div>
          <p className="eyebrow mb-4">Discover</p>
          <div className="flex flex-col gap-3 text-sm text-zinc-400">
            <Link href="/events" className="hover:text-white">Tonight&apos;s events</Link>
            <Link href="/events?category=Techno" className="hover:text-white">Electronic</Link>
            <Link href="/events?category=Bollywood" className="hover:text-white">Bollywood</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-4">For partners</p>
          <div className="flex flex-col gap-3 text-sm text-zinc-400">
            <Link href="/partner" className="hover:text-white">Partner with ARS</Link>
            <Link href="/owner/login" className="hover:text-white">Owner login (existing partners)</Link>
            <Link href="/staff/scanner" className="hover:text-white">Door operations</Link>
            <a href="mailto:hello@ars.events" className="hover:text-white">hello@ars.events</a>
          </div>
        </div>
      </div>
      <div className="ars-page-shell flex flex-col gap-3 border-t border-white/10 px-4 py-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} ARS. All rights reserved.</p>
        <p>Experience the Night.</p>
      </div>
    </footer>
  );
}
