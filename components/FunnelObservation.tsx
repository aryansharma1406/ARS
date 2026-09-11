'use client';
import { useEffect } from 'react';
export default function FunnelObservation({eventId,kind,source}:{eventId:string;kind:'event_view'|'checkout_start';source?:string}) {
  useEffect(()=>{
    // First-party, signed-in observations only. No fingerprinting, IP collection or location inference.
    if(navigator.doNotTrack==='1' || (navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl) return;
    void fetch('/api/telemetry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,kind,source}),keepalive:true}).catch(()=>{});
  },[eventId,kind,source]);
  return null;
}
