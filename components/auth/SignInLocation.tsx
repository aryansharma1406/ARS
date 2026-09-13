'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin} from 'lucide-react';
import {recordCustomerLocation} from '@/lib/customer-location';
import {discoveryKey} from '@/lib/discovery-location';
type Choice={status:'allowed'|'denied'|'skipped'|'unavailable';latitude?:number;longitude?:number};
export default function SignInLocation({next}:{next:string}){
 const dialog=useRef<HTMLDialogElement>(null);const attempt=useRef(0);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [failed,setFailed]=useState<Choice|null>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>{attempt.current+=1;};},[]);
 async function save(choice:Choice){
  setBusy(true);setMessage('');setFailed(null);
  try{await recordCustomerLocation(choice.status,choice.latitude,choice.longitude);window.location.replace(next);}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to save your choice.');setFailed(choice);setBusy(false);}
 }
 function skip(){attempt.current+=1;try{sessionStorage.removeItem(discoveryKey);}catch{}void save({status:'skipped'});}
 function allow(){
  const id=++attempt.current;setBusy(true);setMessage('');setFailed(null);
  if(!navigator.geolocation){void save({status:'unavailable'});return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(id!==attempt.current)return;
   const latitude=Math.round(position.coords.latitude*100)/100,longitude=Math.round(position.coords.longitude*100)/100;
   try{sessionStorage.setItem(discoveryKey,JSON.stringify({latitude,longitude,recordedAt:Date.now()}));}catch{}
   void save({status:'allowed',latitude,longitude});
  },error=>{if(id!==attempt.current)return;try{sessionStorage.removeItem(discoveryKey);}catch{}void save({status:error.code===1?'denied':'unavailable'});},{enableHighAccuracy:false,timeout:10000,maximumAge:0});
 }
 return <main className="min-h-[70svh] px-5 py-16"><dialog ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)skip();}} aria-labelledby="location-title" aria-describedby="location-description" className="m-auto w-[calc(100%-2rem)] max-w-lg border border-[#cbb88a]/30 bg-[#0b0b09] p-6 text-white shadow-2xl backdrop:bg-black/85 sm:p-9"><MapPin className="mb-5 text-[#e2d4ae]" size={30}/><p className="eyebrow">ARS / Welcome in</p><h1 id="location-title" className="mt-4 text-3xl font-black tracking-tight">Discover nights near you.</h1><p id="location-description" className="mt-5 text-sm leading-7 text-zinc-400">Allow a one-time location request? ARS will record your choice and, if allowed, save your approximate location with the time for nearby venues, events and location analytics. We round coordinates and keep only your latest snapshot, not a movement history. No background tracking.</p><p className="mt-3 text-xs leading-6 text-zinc-500">You can skip or deny permission and continue normally. Your browser controls its own permission popup.</p>{message&&<p role="alert" className="mt-5 border-l-2 border-amber-300 bg-amber-300/10 p-3 text-sm text-amber-100">{message}</p>}<div className="mt-7 space-y-3">{failed?<><button disabled={busy} onClick={()=>void save(failed)} className="ars-button w-full">Retry saving choice</button><a href={next} className="ars-button ars-button-secondary w-full">Continue without saving</a></>:<><button autoFocus disabled={busy} onClick={allow} className="ars-button w-full">{busy?'Please wait...':'Allow location'}</button><button disabled={busy} onClick={skip} className="ars-button ars-button-secondary w-full">Skip for now</button></>}</div></dialog></main>;
}
