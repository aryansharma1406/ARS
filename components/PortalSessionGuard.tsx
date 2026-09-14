'use client';
import {useEffect,useState,type ReactNode} from 'react';

export default function PortalSessionGuard({portal,children}:{portal:'admin'|'owner';children:ReactNode}){
  const [unavailable,setUnavailable]=useState(false);
  const [ended,setEnded]=useState(false);
  useEffect(()=>{
    let disposed=false,busy=false;
    let controller:AbortController|undefined;
    async function check(){
      if(disposed||busy||document.hidden)return;
      busy=true;
      controller=new AbortController();
      const timeout=window.setTimeout(()=>controller?.abort(),10000);
      try{
        const response=await fetch('/api/auth/portal-session',{method:'POST',cache:'no-store',signal:controller.signal});
        if(disposed)return;
        if(response.status===401||response.status===403){
          setEnded(true);
          window.location.replace(`/${portal}/login?reason=session-ended`);
          return;
        }
        setUnavailable(!response.ok);
      }catch{if(!disposed)setUnavailable(true);}
      finally{window.clearTimeout(timeout);busy=false;}
    }
    void check();
    const timer=window.setInterval(()=>void check(),15000);
    const focus=()=>void check();
    window.addEventListener('focus',focus);
    document.addEventListener('visibilitychange',focus);
    return()=>{disposed=true;controller?.abort();window.clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[portal]);
  if(ended)return <p role="status" className="p-8 text-[#e2d4ae]">Session ended. Returning to sign in...</p>;
  return <>{children}{unavailable&&<div role="alert" className="fixed inset-0 z-[300] flex items-center justify-center bg-[#080808] p-6"><div className="max-w-md space-y-4 text-center"><h2 className="text-xl font-bold text-[#e2d4ae]">Session verification unavailable</h2><p className="text-sm text-zinc-400">Reconnect to continue securely. We will retry automatically.</p><button type="button" onClick={()=>window.location.reload()} className="ars-button">Try again</button></div></div>}</>;
}
