'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('reason')==='session-ended')setError('Your previous session ended. A new login on another device replaces it. Sign in to continue.');},[]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      router.replace('/owner');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060606] px-0 py-0 sm:px-6 sm:py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1440px] overflow-hidden border border-white/10 bg-[#0a0a0a] lg:grid-cols-2">
        <div className="relative isolate hidden overflow-hidden border-r border-white/10 bg-[#090909] p-12 lg:flex lg:flex-col lg:justify-between">
          <Image src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=85&w=1600&auto=format&fit=crop" alt="Nightlife atmosphere" fill priority sizes="50vw" className="-z-20 object-cover object-center opacity-60"/>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/45 to-black/20"/>
          <Image src="/ars-logo.svg" alt="ARS Hospitality" width={240} height={100} className="h-14 w-auto self-start object-contain" />
          <div>
            <p className="eyebrow">Venue intelligence</p>
            <h1 className="mt-5 text-[clamp(3.5rem,5.5vw,5.5rem)] font-black uppercase leading-[.9]">
              Run the room.<br />Know the numbers.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-300">Live sales, attendance, promoter and settlement clarity for every venue you operate.</p>
          </div>
          <p className="text-xs uppercase tracking-[.15em] text-zinc-400">ARS partner network</p>
        </div>

        <div className="flex items-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md mx-auto">
            <Image src="/ars-logo.svg" alt="ARS Hospitality" width={240} height={100} className="mb-12 h-12 w-auto object-contain lg:hidden" />
            <div className="py-8">
              <LockKeyhole className="mb-6 text-[#cbb88a]" />
              <p className="eyebrow">Secure owner access</p>
              <h2 className="mt-3 text-4xl font-black uppercase">Welcome back</h2>
              <p className="mt-3 text-sm text-zinc-500">Sign in with your assigned venue-owner account.</p>

              <form onSubmit={submit} className="mt-9 space-y-5">
                <label className="block text-sm text-zinc-300">
                  Email
                  <input
                    autoComplete="username" placeholder="you@venue.com" type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ars-input mt-2"
                  />
                </label>

                <label className="block text-sm text-zinc-300">
                  Password
                  <div className="relative mt-2">
                    <input
                      autoComplete="current-password" placeholder="Enter your password" type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ars-input !pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error && <div role="alert" className="border-l-2 border-red-400 bg-red-950/30 p-4 text-sm text-red-200"><p className="mb-1 font-semibold">Unable to sign in</p><p>{error}</p>{error.includes('origin denied') && <p className="mt-3 text-xs leading-5 text-red-200/80">This address does not match the configured sign-in origin. Open the configured ARS address, or ask your administrator to verify the application URL.</p>}</div>}
                <button disabled={busy} className="ars-button w-full">
                  {busy ? 'Verifying…' : 'Enter owner portal'}
                  <ArrowRight size={16} />
                </button>
              </form>
              <p className="mt-6 text-xs leading-5 text-zinc-600">Access is limited to assigned venues. Use your assigned account to manage your venue.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
