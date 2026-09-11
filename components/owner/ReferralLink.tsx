'use client';
import { useState } from 'react';
export default function ReferralLink({code}:{code:string}) {
  const [message,setMessage]=useState('');
  const path=`/r/${encodeURIComponent(code)}`;
  return <div className="flex flex-wrap items-center gap-3"><a href={path} target="_blank" rel="noreferrer" className="text-xs text-[#e2d4ae] underline underline-offset-4">{path}</a><button type="button" className="text-xs text-zinc-400" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(path,window.location.origin).href);setMessage('Copied');}catch{setMessage('Copy unavailable; open the link to copy it.');}}}>Copy link</button><span role="status" className="text-xs text-zinc-500">{message}</span></div>;
}
