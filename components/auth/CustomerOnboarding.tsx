'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { completeCustomerProfile } from '@/lib/customer-onboarding';
import { areaKey, discoveryKey, nearbyVenues, type DiscoveryLocation, type DiscoveryVenue } from '@/lib/discovery-location';
export default function CustomerOnboarding({name:initialName,email:initialEmail,next,venues,skipLocation=false}:{name:string;email:string;next:string;venues:DiscoveryVenue[];skipLocation?:boolean}) {
 const [name,setName]=useState(initialName);
 const [email,setEmail]=useState(initialEmail);
 const [step,setStep]=useState<'profile'|'email'|'location'>('profile');
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [area,setArea]=useState('');
 const [point,setPoint]=useState<DiscoveryLocation|null>(null);
 const generation=useRef(0);
 useEffect(()=>()=>{generation.current+=1;},[]);
 async function saveProfile(){
  setBusy(true);setMessage('');
  try {const result=await completeCustomerProfile(name,email);setMessage(result.warning || (result.emailPending?'An email verification code has been sent. You can also finish this later.':''));if(skipLocation&&!result.emailPending){window.location.assign(next);return;}setStep(result.emailPending?'email':'location');}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to save. Please try again.');}finally{setBusy(false);}
 }
 async function verifyEmail(){
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/auth/customer-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'link-verify',channel:'email',identifier:email.trim(),token:code})});const data=await r.json();if(!r.ok)throw new Error(data.error);if(data.pending){setMessage(data.message);setCode('');}else if(skipLocation)window.location.assign(next);else setStep('location');}
  catch(e){setMessage(e instanceof Error?e.message:'Could not verify email.');}finally{setBusy(false);}
 }
 function locate(){
  if(!navigator.geolocation){setMessage('Location is unavailable. Choose an area or skip.');return;}
  const attempt=++generation.current;setBusy(true);setMessage('');
  navigator.geolocation.getCurrentPosition(position=>{
   if(attempt!==generation.current)return;
   const value={latitude:Math.round(position.coords.latitude*100)/100,longitude:Math.round(position.coords.longitude*100)/100,recordedAt:Date.now()};
   setPoint(value);setBusy(false);
   try{sessionStorage.setItem(discoveryKey,JSON.stringify(value));}catch{/* Discovery still works for this screen. */}
   const closest=nearbyVenues(venues,value)[0];
   setMessage(closest?'Location ready. Open Events to explore venues by approximate distance.':'Location received. Venue map positions are not available yet; choose an area below or continue with all events.');
  },()=>{if(attempt!==generation.current)return;setBusy(false);setMessage('No problem. You can choose an area or continue without location.');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
 }
 async function finish(skip=false){
  generation.current+=1;setBusy(true);
  if(skip){setPoint(null);try{sessionStorage.removeItem(discoveryKey);sessionStorage.removeItem(areaKey);}catch{}}
  else try{if(area)sessionStorage.setItem(areaKey,area);else sessionStorage.removeItem(areaKey);}catch{}
  // Area analytics are optional and cannot block access to the account.
  if(!skip && area)try{await completeCustomerProfile(name,'',area);}catch{}
  window.location.assign(next);
 }
 const nearest=point?nearbyVenues(venues,point).slice(0,3):[];
 return <main className="mx-auto max-w-lg px-5 py-14 sm:py-20"><p className="eyebrow">ARS / Make it yours</p><p className="mt-6 text-xs uppercase tracking-[.2em] text-zinc-500">{step==='profile'?'01 / Your membership':step==='email'?'Optional / Verify email':'02 / Your city, your nights'}</p><h1 className="mt-4 text-4xl font-black tracking-tight">{step==='profile'?'What should we call you?':step==='email'?'One optional detail.':'Find your kind of nearby.'}</h1>
 {message&&<p role="status" className="mt-5 border-l-2 border-[#cbb88a] bg-[#cbb88a]/10 p-4 text-sm leading-6 text-[#e2d4ae]">{message}</p>}
 {step==='profile'&&<form onSubmit={e=>{e.preventDefault();void saveProfile();}} className="mt-8 space-y-6"><label className="ars-label">Your name<input required autoComplete="name" maxLength={120} disabled={busy} value={name} onChange={e=>setName(e.target.value)} className="ars-input mt-2" placeholder="Your full name"/></label>{!initialEmail && <label className="ars-label">Email (optional)<input type="email" autoComplete="email" maxLength={254} disabled={busy} value={email} onChange={e=>setEmail(e.target.value)} className="ars-input mt-2" placeholder="you@example.com"/></label>}<p className="text-xs leading-6 text-zinc-500">{initialEmail ? "Your existing email account and passes stay unchanged. No mobile number is required." : "Your verified mobile remains your sign-in identity. Adding an email requires verification and does not merge accounts."}</p><button disabled={busy} className="ars-button w-full">{busy?'Saving...':'Continue'}<ArrowRight size={16}/></button></form>}
 {step==='email'&&<div className="mt-8 space-y-5"><form onSubmit={e=>{e.preventDefault();void verifyEmail();}} className="space-y-5"><label className="ars-label">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="ars-input mt-2"/></label><button disabled={busy} className="ars-button w-full">Verify email</button></form><button disabled={busy} onClick={()=>{if(skipLocation)window.location.assign(next);else setStep('location');setMessage('You can verify your email later in Account.');}} className="ars-button ars-button-secondary w-full">Do this later</button></div>}
 {step==='location'&&<div className="mt-6 space-y-6"><p className="text-sm leading-7 text-zinc-400">Allow a one-time location request to discover nearby venues and events. We round your position, keep it only in this browser session for up to an hour, and never track you in the background. You can skip and use every other feature normally.</p><button disabled={busy} onClick={locate} className="ars-button w-full"><MapPin size={16}/>{busy?'Please wait...':'Use my location'}</button><label className="ars-label">Or choose an area<select className="ars-select mt-2" value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{[...new Set(venues.map(v=>v.location).filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label><p className="text-xs leading-6 text-zinc-500">A manually selected area may be saved for discovery and area-level analytics. GPS coordinates are not saved to your ARS account.</p>{nearest.length>0&&<div className="border border-[#cbb88a]/20 p-4"><p className="eyebrow mb-3">Closest mapped venues</p>{nearest.map(v=><p key={v.id} className="flex justify-between gap-3 py-2 text-sm"><span>{v.name}</span><span className="text-[#cbb88a]">~{Math.round(v.distance)} km</span></p>)}</div>}<button disabled={busy} onClick={()=>void finish()} className="ars-button w-full">Continue to ARS<ArrowRight size={16}/></button><button onClick={()=>void finish(true)} className="min-h-11 w-full text-sm text-zinc-400 underline underline-offset-4">Skip location</button></div>}
 <Link href="/account/tickets" className="mt-8 block text-center text-xs text-zinc-500 underline">My existing passes</Link></main>;
}
