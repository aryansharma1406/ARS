'use client';
import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

export default function CatalogImage({src,alt,className='',sizes='100vw',priority=false}:{src:string;alt:string;className?:string;sizes?:string;priority?:boolean}) {
 const [failedSource,setFailedSource] = useState<string | null>(null);
 let uploadedPhoto = false;
 try {
   const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
   const photo = new URL(src);
   uploadedPhoto = photo.origin === project.origin && photo.protocol === 'https:' && photo.pathname.startsWith('/storage/v1/object/public/ars-venue-photos/');
 } catch { /* Local images and unconfigured storage use the existing checks. */ }
 const supported = uploadedPhoto || src?.startsWith('/') && !src.startsWith('//') || /^https:\/\/((images|plus)\.unsplash\.com|lh3\.googleusercontent\.com)\//.test(src || '');
 if (!supported || failedSource === src) return <div role="img" aria-label={`${alt} — image unavailable`} className="absolute inset-0 flex flex-col items-center justify-center gap-4 border border-white/10 bg-[#171714] text-[#777367]"><ImageIcon size={32} strokeWidth={1}/><span className="text-[10px] uppercase tracking-[.18em]">Image to be announced</span></div>;
 return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={className} onError={() => setFailedSource(src)}/>;
}
