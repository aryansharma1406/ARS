'use client';

import { ArrowRight,LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const res=await fetch('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const data=await res.json();if(!res.ok)throw new Error(data.error);router.replace('/owner');router.refresh();}catch(err){setError(err instanceof Error?err.message:'Sign-in failed.');setBusy(false);}}
  return <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden border border-white/10 bg-[#0a0a0a] lg:grid-cols-2">
      <div className="relative hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <Image src="/logo.png" alt="ARS" width={150} height={50} className="h-12 w-auto object-contain" />
        <div><p className="eyebrow">Venue intelligence</p><h1 className="mt-5 text-6xl font-black uppercase leading-[.9]">Run the room.<br/>Know the numbers.</h1><p className="mt-6 max-w-md text-zinc-500">Live sales, attendance, promoter and settlement clarity for every venue you operate.</p></div>
        <p className="text-xs uppercase tracking-[.15em] text-zinc-700">ARS partner network</p>
      </div>
      <div className="flex items-center p-6 sm:p-12 lg:p-16"><div className="w-full max-w-md mx-auto">
        <Image src="/logo.png" alt="ARS" width={120} height={40} className="mb-12 h-10 w-auto object-contain lg:hidden" />
        <LockKeyhole className="mb-6 text-[#cbb88a]"/><p className="eyebrow">Secure owner access</p><h2 className="mt-3 text-4xl font-black uppercase">Welcome back</h2><p className="mt-3 text-sm text-zinc-500">Sign in with your assigned venue-owner account.</p>
        <form onSubmit={submit} className="mt-9 space-y-5"><label className="block text-sm text-zinc-300">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white" /></label><label className="block text-sm text-zinc-300">Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white" /></label>{error&&<p role="alert" className="border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}<button disabled={busy} className="ars-button w-full">{busy?'Verifying…':'Enter owner portal'}<ArrowRight size={16}/></button></form>
        <p className="mt-6 text-xs leading-5 text-zinc-600">Access is limited to assigned venues. Every sensitive action is verified and recorded.</p>
      </div></div>
    </div>
  </main>;
}
