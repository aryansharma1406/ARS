'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function LoginForm({ portal, next }: { portal?: 'admin'|'staff'; next?: string }) {
  const router = useRouter();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(signup = false) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(signup ? '/api/auth/signup' : `/api/${portal || 'auth'}/login`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(signup ? {email,password} : {email,password,next}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
      if (signup) setMessage(data.message);
      else { router.replace(data.next); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-4 py-16 text-white"><p className="eyebrow">{portal ? `${portal} access` : 'Your ARS account'}</p><h1 className="mt-3 text-3xl font-black uppercase">Sign in</h1><form onSubmit={event=>{event.preventDefault();void submit();}} className="mt-8 space-y-5"><label className="block text-sm">Email<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full border border-white/15 bg-black px-4 py-3"/></label><label className="block text-sm">Password<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full border border-white/15 bg-black px-4 py-3"/></label>{message&&<p role="alert" className="text-sm text-amber-200">{message}</p>}<button disabled={busy} className="ars-button w-full">{busy?'Verifying…':'Sign in'}</button>{!portal&&<button type="button" disabled={busy} onClick={()=>void submit(true)} className="w-full py-3 text-sm text-zinc-400">Create customer account</button>}</form></main>;
}
