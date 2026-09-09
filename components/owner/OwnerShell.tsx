'use client';

import type { Venue } from '@/lib/types';
import { BarChart3,CalendarDays,CreditCard,LayoutDashboard,LogOut,Megaphone,MoreHorizontal,Settings,Ticket,UserRoundCog,Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname,useRouter,useSearchParams } from 'next/navigation';

const items=[['Overview','/owner',LayoutDashboard],['Events','/owner/events',CalendarDays],['Tickets','/owner/tickets',Ticket],['Customers','/owner/customers',Users],['Promoters','/owner/promoters',Megaphone],['Analytics','/owner/analytics',BarChart3],['Settlements','/owner/settlements',CreditCard],['Staff','/owner/staff',UserRoundCog],['Settings','/owner/settings',Settings]] as const;

export default function OwnerShell({children,venues,ownerName}:{children:React.ReactNode;venues:Venue[];ownerName:string}){
 const pathname=usePathname();const router=useRouter();const params=useSearchParams();const selected=params.get('venue')||venues[0]?.id;
 function switchVenue(id:string){const next=new URLSearchParams(params);next.set('venue',id);router.push(`${pathname}?${next}`);}
 return <div className="min-h-screen bg-[#070707] text-zinc-100 lg:grid lg:grid-cols-[236px_1fr]">
  <aside className="hidden min-h-screen border-r border-white/10 bg-[#090909] p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"><Image src="/logo.png" alt="ARS" width={110} height={36} className="h-9 w-auto object-contain"/><p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-600">Venue operations</p><nav className="mt-4 space-y-1">{items.map(([label,href,Icon])=>{const active=pathname===href||(href!='/owner'&&pathname.startsWith(href));return <Link key={href} href={`${href}?venue=${selected}`} className={`flex min-h-11 items-center gap-3 px-3 text-sm transition ${active?'bg-[#e8e3d8] text-black':'text-zinc-500 hover:bg-white/5 hover:text-white'}`}><Icon size={17}/>{label}</Link>})}</nav><form action="/api/owner/logout" method="post" className="mt-auto"><button className="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-zinc-600 hover:text-white"><LogOut size={17}/>Sign out</button></form></aside>
  <div className="min-w-0 pb-20 lg:pb-0"><header className="sticky top-0 z-30 flex min-h-[70px] items-center justify-between border-b border-white/10 bg-[#070707]/95 px-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-600">Venue</p><select aria-label="Active venue" value={selected} onChange={e=>switchVenue(e.target.value)} className="!min-h-0 border-0 bg-transparent py-1 text-sm font-bold text-white outline-none">{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div><div className="text-right"><p className="text-xs text-zinc-600">Signed in as</p><p className="text-sm font-semibold">{ownerName}</p><form action="/api/owner/logout" method="post" className="lg:hidden"><button className="mt-2 text-xs text-zinc-400">Sign out</button></form></div></header><main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">{children}</main></div>
  <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#090909]/98 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">{items.slice(0,4).map(([label,href,Icon])=><Link key={href} href={`${href}?venue=${selected}`} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${pathname===href?'text-[#d8c79e]':'text-zinc-600'}`}><Icon size={18}/>{label}</Link>)}<Link href={`/owner/settings?venue=${selected}`} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] text-zinc-600"><MoreHorizontal size={18}/>More</Link></nav>
 </div>
}
