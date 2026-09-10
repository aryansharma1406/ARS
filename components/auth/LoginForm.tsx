'use client';

import { Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Portal = 'admin' | 'staff' | undefined;

export default function LoginForm({ portal, next }: { portal?: Portal; next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdminPortal = portal === 'admin';
  const portalLabel = portal ? `${portal} access` : 'customer account';

  async function submit(signup = false) {
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(signup ? '/api/auth/signup' : `/api/${portal || 'auth'}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup ? { email, password } : { email, password, next }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Sign-in failed.');
      }

      if (signup) {
        setMessage(data.message || 'Account created. Check your inbox to confirm.');
        return;
      }

      router.replace(data.next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submit(mode === 'signup');
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-lg items-center px-4 py-10 text-white">
      <div className="ars-card w-full border border-white/10 bg-[#090909] p-8 sm:p-10">
        <p className="eyebrow">ARS {portalLabel}</p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-[.04em] sm:text-4xl">{isAdminPortal ? 'Internal access' : mode === 'signup' ? 'Join the night' : 'Sign in'}</h1>
        <p className="mt-3 max-w-sm text-sm text-zinc-500">
          {portal ? 'Sign in with your assigned account.' : 'Secure access to your dashboard and tickets.'}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <label className="ars-label block">
            Email
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ars-input mt-1 !pl-10"
                placeholder="you@domain.com"
              />
            </div>
          </label>

          <label className="ars-label block">
            Password
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete={portal ? 'current-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ars-input mt-1 !pr-20 !pl-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs uppercase tracking-[.12em] text-zinc-300"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {message && <p role="status" className={`text-xs ${mode === 'signup' ? 'text-emerald-300' : 'text-red-200'} rounded border px-3 py-2 ${mode === 'signup' ? 'border-emerald-600/40 bg-emerald-950/40' : 'border-red-800 bg-red-950/40'}`}>{message}</p>}

          <button disabled={busy} className="ars-button w-full">
            {busy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</> : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!portal && (
          <p className="mt-6 text-xs text-zinc-400">
            Need an account?
            <button
              type="button"
              className="ml-2 text-white underline decoration-[#cbb88a] underline-offset-4"
              onClick={() => setMode((value) => (value === 'signin' ? 'signup' : 'signin'))}
            >
              {mode === 'signin' ? 'Create new account' : 'Back to sign in'}
            </button>
          </p>
        )}

        <p className="mt-8 flex items-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          {portal ? 'Use your assigned role credentials and keep access secure.' : 'Your events and digital passes, together in one place.'}
        </p>
      </div>
    </main>
  );
}
