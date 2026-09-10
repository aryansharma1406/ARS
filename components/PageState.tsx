import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';

export function PageLoading() {
  return <div role="status" aria-label="Loading page" className="mx-auto max-w-7xl animate-pulse space-y-8 px-5 py-16"><p className="eyebrow">Loading your view</p><div className="h-14 w-2/3 bg-white/10"/><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 border-t border-white/15 bg-white/[.03]"/>)}</div><div className="h-72 border border-white/10 bg-white/[.02]"/></div>;
}
export function EmptyState({ title = 'Nothing here yet', copy = 'New records will appear here when available.' }: {title?:string;copy?:string}) {
 return <div className="border border-white/10 bg-[#0d0d0c] px-6 py-12 text-center"><CalendarDays size={24} className="mx-auto mb-5 text-[#cbb88a]"/><h2 className="text-xl font-bold uppercase">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">{copy}</p></div>;
}
export function NotFoundState() {
 return <div className="mx-auto max-w-3xl px-6 py-24"><p className="eyebrow">ARS / 404</p><h1 className="mt-6 text-5xl font-black uppercase tracking-tight sm:text-7xl">This night<br/>is out of reach.</h1><p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">This page is unavailable or the link has changed. Explore the current line-up to find your next night.</p><Link href="/events" className="ars-button mt-8">Explore events <ArrowRight size={16}/></Link></div>;
}
