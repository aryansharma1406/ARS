'use client';

import {useId,useRef,useState} from 'react';
import {UPI_ID} from '@/lib/manual-upi';

type Platform='ios'|'android'|'desktop';
const apps=[
 {name:'Google Pay',ios:'gpay://upi/pay',android:'com.google.android.apps.nbu.paisa.user'},
 {name:'PhonePe',ios:'phonepe://pay',android:'com.phonepe.app'},
 {name:'Paytm',ios:'paytmmp://upi/pay',android:'net.one97.paytm'},
];

export default function UpiAppPicker({href}:{href:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const title=useId();
 const [platform,setPlatform]=useState<Platform>('desktop');
 const [message,setMessage]=useState('');
 function open(){
  const ua=navigator.userAgent;
  setPlatform(/android/i.test(ua)?'android':/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'ios':'desktop');
  setMessage('');dialog.current?.showModal();
 }
 function appUrl(app:typeof apps[number]){
  // Preserve the existing server-derived amount, payee and order reference.
  const query=new URL(href).search;
  return platform==='android'?`intent://pay${query}#Intent;scheme=upi;package=${app.android};end`:`${app.ios}${query}`;
 }
 async function copy(){
  try{await navigator.clipboard.writeText(UPI_ID);setMessage('UPI ID copied. Enter the exact amount shown on this page in your payment app.');}
  catch{setMessage(`Copy this UPI ID manually: ${UPI_ID}`);}
 }
 return <>
  <button type="button" className="btn-primary" onClick={open}>Open UPI App</button>
  <dialog ref={dialog} aria-labelledby={title} className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[85dvh] overflow-y-auto border border-[#776b49] bg-[#10110c] p-6 text-[#eee9dc] shadow-2xl backdrop:bg-black/75">
   <div className="mb-4 flex items-center justify-between gap-4"><h2 id={title} className="text-xl">Choose your UPI app</h2><button type="button" aria-label="Close app picker" className="min-h-11 px-3 text-[#d2bd84]" onClick={()=>dialog.current?.close()}>Close</button></div>
   <p className="mb-5 text-sm text-zinc-400">Choose an app you have installed. This website cannot detect installed apps. Opening an app does not confirm payment.</p>
   {platform==='desktop'?<p className="mb-5 text-sm">Scan the payment QR with your phone, or copy the UPI ID below.</p>:<div className="grid gap-3">
    {apps.map(app=><a key={app.name} href={appUrl(app)} className="flex min-h-12 items-center justify-between border border-[#494536] px-4 py-3 hover:bg-[#242318] focus-visible:outline focus-visible:outline-[#d2bd84]" onClick={()=>setMessage('If the app does not open or declines this payment link, use the QR or copy the UPI ID. After paying, return here and submit your UTR. Do not pay twice.')}><span>{app.name}</span><span className="text-xs text-[#d2bd84]">Open</span></a>)}
    {platform==='android'&&<a href={href} className="min-h-12 px-4 py-3 text-[#d2bd84]">Other UPI app / system chooser</a>}
   </div>}
   <button type="button" onClick={()=>void copy()} className="mt-5 min-h-12 w-full border border-[#494536] px-4 py-3">Copy UPI ID</button>
   <button type="button" onClick={()=>dialog.current?.close()} className="mt-2 min-h-11 w-full text-[#d2bd84]">Back to payment QR</button>
   <p role="status" className="mt-3 text-sm text-zinc-400">{message}</p>
   <p className="mt-4 text-xs text-zinc-400">Verify the payee and exact payable amount before paying. Your pass is issued only after admin verification.</p>
  </dialog>
 </>;
}
