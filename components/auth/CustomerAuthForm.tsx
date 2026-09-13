'use client';

import { ArrowRight, LockKeyhole, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { customerAuthRedirect } from '@/lib/customer-auth-origin';
import MobileCustomerAuth from './MobileCustomerAuth';
import { getMyMarketing, saveMyMarketing } from '@/lib/customer-marketing';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
const callbackMessages: Record<string, string> = {
  confirmation: 'This confirmation link is invalid or has expired. Please request a new account confirmation.',
  oauth_cancelled: 'Google sign-in was cancelled or could not be completed. Please try again or use email.',
  auth_callback: 'This sign-in link is invalid or has expired. Start again in this browser.',
  customer_access: 'This account cannot access the customer area. Please use the dedicated login for your assigned role.',
};

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor"><path d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.6h3.4c2-1.8 2.9-4.4 2.9-7.5Z"/><path d="M12 22c2.7 0 5-.9 6.8-2.4l-3.4-2.6c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.1H2.8v2.7A10.2 10.2 0 0 0 12 22Z"/><path d="M6.3 13.9a6.2 6.2 0 0 1 0-3.8V7.4H2.8a10.2 10.2 0 0 0 0 9.2l3.5-2.7Z"/><path d="M12 6c1.5 0 2.9.5 4 1.6l3-3A9.8 9.8 0 0 0 12 2a10.2 10.2 0 0 0-9.2 5.4l3.5 2.7C7.1 7.8 9.4 6 12 6Z"/></svg>;
}

export default function CustomerAuthForm(props: { next?: string; initialMode?: Mode; errorCode?: string; appUrl?: string }) {
  return props.initialMode === 'reset' || props.initialMode === 'forgot'
    ? <LegacyCustomerAuthForm {...props}/>
    : <MobileCustomerAuth {...props}/>;
}

function LegacyCustomerAuthForm({ next, initialMode = 'signin', errorCode, appUrl }: { next?: string; initialMode?: Mode; errorCode?: string; appUrl?: string }) {
  const [originReady, setOriginReady] = useState(!appUrl);
  const [originError, setOriginError] = useState(false);
  useEffect(() => {
    try {
      const destination = customerAuthRedirect(window.location.href, appUrl);
      if (destination) {
        window.location.replace(destination);
        return;
      }
      setOriginReady(true);
    } catch { setOriginError(true); }
  }, [appUrl]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [signedInNext, setSignedInNext] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    errorCode && callbackMessages[errorCode] ? { kind: 'error', text: callbackMessages[errorCode] } : null,
  );
  const resetComplete = mode === 'reset' && feedback?.kind === 'success';
  const title = mode === 'signup' ? 'Join the night.' : mode === 'forgot' ? 'Find your way back.' : mode === 'reset' ? 'A fresh start.' : 'Your night awaits.';
  const description = mode === 'signup' ? 'One account. Every night worth remembering.' : mode === 'forgot' ? 'Enter your email and we’ll send a password reset link.' : mode === 'reset' ? 'Choose a new password for your ARS account.' : 'Sign in for your events, your plans and your passes.';

  function switchMode(value: Mode) {
    setMode(value);
    setFeedback(null);
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
  }

  async function googleSignIn() {
    setBusy('google');
    setFeedback(null);
    try {
      const response = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Google sign-in could not start.');
      window.location.assign(data.url);
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Google sign-in is unavailable. Please try email.' });
      setBusy(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (mode === 'reset' && password !== confirmation) {
      setFeedback({ kind: 'error', text: 'The passwords do not match.' });
      return;
    }
    setBusy('email');
    try {
      const endpoint = mode === 'signup' ? 'signup' : mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : 'login';
      const body = mode === 'forgot' ? { email } : mode === 'reset' ? { password } : mode === 'signup' ? { email, password } : { email, password, next };
      const response = await fetch(`/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We couldn’t complete that request. Please try again.');
      if (mode === 'signin') {
        if (whatsapp) {
          try {
            const { preference } = await getMyMarketing();
            await saveMyMarketing({
              city: preference?.city || '',
              phone: whatsappPhone.trim(),
              whatsapp: true,
              email_marketing: preference?.email_marketing || false,
              // Consent to SMS at a different number must not transfer silently.
              sms: preference?.phone === whatsappPhone.trim() && !!preference?.sms,
            });
          } catch {
            setSignedInNext(data.next);
            setFeedback({ kind: 'success', text: 'You are signed in, but your WhatsApp permission could not be saved. Continue to your passes; no new permission has been confirmed.' });
            return;
          }
        }
        setFeedback({ kind: 'success', text: 'Signed in. Opening your account…' });
        // Use a document navigation after the session cookie is written. This
        // avoids a pending client-side RSC transition retaining the login UI.
        window.location.assign(data.next);
      } else {
        setFeedback({ kind: 'success', text: data.message || 'Check your email for the next step.' });
        setPassword('');
        setConfirmation('');
      }
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setBusy(null); }
  }

  if (!originReady) return <section role={originError ? 'alert' : 'status'} className="mx-auto max-w-md px-5 py-24"><p className="eyebrow mb-4">Your ARS account</p><h1 className="text-3xl font-black uppercase">{originError ? 'Sign-in unavailable' : 'Opening secure sign-in'}</h1><p className="mt-4 text-sm leading-6 text-zinc-400">{originError ? 'The application sign-in address is not configured correctly. Please contact the site administrator.' : 'Taking you to the configured ARS address to keep your account session secure.'}</p>{!originError && <RefreshCw aria-hidden="true" size={20} className="mt-6 animate-spin text-[#cbb88a]"/>}</section>;

  return (
    <section aria-labelledby="customer-auth-title" className="mx-auto grid min-h-[calc(100svh-74px)] max-w-6xl items-center gap-14 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
      <div className="hidden self-stretch flex-col justify-between border-l border-white/10 pl-9 py-10 lg:flex">
        <p className="eyebrow">ARS / After dark</p>
        <div><p className="text-[clamp(3rem,5.4vw,5rem)] font-black uppercase leading-[.95] tracking-[-.065em]">Great nights.<br/>One<br/><span className="text-[#b6a786]">way in.</span></p><p className="mt-7 max-w-xs text-sm leading-7 text-zinc-400">Your next experience starts here. Keep every digital pass close, wherever the night takes you.</p></div>
        <Link href="/events" className="editorial-link mt-12 w-fit">Discover the line-up <ArrowRight size={15}/></Link>
      </div>
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow mb-4">Your ARS account</p>
        <h1 id="customer-auth-title" className="text-[2.5rem] font-black uppercase leading-[.98] tracking-[-.055em] sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{description}</p>
          {feedback && <div role={feedback.kind === 'error' ? 'alert' : 'status'} className={`mt-6 border-l-2 p-4 text-sm leading-6 ${feedback.kind === 'error' ? 'border-red-400 bg-red-950/25 text-red-200' : 'border-emerald-400 bg-emerald-950/25 text-emerald-200'}`}>{feedback.text}</div>}
          {signedInNext && <a href={signedInNext} className="ars-button mt-4 w-full">Continue to my passes <ArrowRight size={16}/></a>}


        {(mode === 'signin' || mode === 'signup') && <div className="mt-8">
          <button type="button" disabled={!!busy} onClick={googleSignIn} className="flex min-h-14 w-full items-center justify-center gap-3 border border-white/25 bg-[#111110] px-5 text-sm font-semibold text-[#f5f3ee] transition-colors hover:border-[#cbb88a] hover:bg-[#1a1916]">
            {busy === 'google' ? <RefreshCw size={18} className="animate-spin"/> : <GoogleMark/>}{busy === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
          </button>
          <div className="my-7 flex items-center gap-5" aria-hidden="true"><span className="h-px flex-1 bg-white/10"/><span className="text-[10px] uppercase tracking-[.2em] text-zinc-500">Or</span><span className="h-px flex-1 bg-white/10"/></div>
        </div>}

        <form onSubmit={submit} className={`${mode === 'forgot' || mode === 'reset' ? 'mt-8' : ''} space-y-5`} aria-busy={!!busy}>
          {mode !== 'reset' && <label className="ars-label">Email<div className="relative mt-2"><Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/><input required disabled={!!busy} type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="ars-input !pl-11" placeholder="you@example.com"/></div></label>}
          {mode !== 'forgot' && !resetComplete && <label className="ars-label">{mode === 'reset' ? 'New password' : 'Password'}<div className="relative mt-2"><LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/><input required disabled={!!busy} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? undefined : 12} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="ars-input !pl-11 !pr-20" placeholder={mode === 'signin' ? 'Your password' : 'At least 12 characters'}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-2 min-w-14 text-[10px] uppercase tracking-widest text-zinc-300">{showPassword ? 'Hide' : 'Show'}</button></div></label>}
          {mode === 'reset' && !resetComplete && <label className="ars-label">Confirm new password<input required disabled={!!busy} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={256} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="ars-input mt-2" placeholder="Repeat your new password"/></label>}
          {mode === 'signin' && <div className="text-right"><button type="button" disabled={!!busy} onClick={() => switchMode('forgot')} className="min-h-8 text-xs text-zinc-400 underline decoration-white/20 underline-offset-4 transition hover:text-[#e2d4ae]">Forgot password?</button></div>}
          {mode === 'signin' && <div className="border border-[#cbb88a]/20 bg-[#cbb88a]/5 p-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
              <input type="checkbox" checked={whatsapp} disabled={!!busy} onChange={e => setWhatsapp(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#cbb88a]"/>
              <span>I agree to receive ARS event updates and promotional offers on WhatsApp. <span className="text-zinc-500">Optional, for email sign-in.</span></span>
            </label>
            {whatsapp && <label className="ars-label mt-4">WhatsApp number<input type="tel" autoComplete="tel" required disabled={!!busy} value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} pattern="\+[1-9][0-9]{7,14}" maxLength={16} placeholder="+919876543210" title="Include country code, with no spaces, for example +919876543210" className="ars-input mt-2"/><span className="mt-2 block text-xs normal-case tracking-normal text-zinc-400">Include your country code, without spaces.</span></label>}
            <p className="mt-3 text-xs leading-5 text-zinc-500">Leaving this unchecked does not change existing consent. You can <Link href="/account/marketing" className="text-[#cbb88a] underline underline-offset-4">withdraw permission</Link> after signing in.</p>
          </div>}
          {resetComplete ? <Link href="/account/tickets" className="ars-button w-full">Open my passes <ArrowRight size={16}/></Link> : <button disabled={!!busy} className="ars-button w-full">{busy === 'email' ? <><RefreshCw size={16} className="animate-spin"/>Processing…</> : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Sign in'}</button>}
        </form>
        {mode !== 'reset' && <p className="mt-6 text-center text-xs leading-6 text-zinc-400">{mode === 'signin' ? 'New to ARS?' : mode === 'signup' ? 'Already have an account?' : 'Remember your password?'}<button type="button" disabled={!!busy} onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="ml-2 min-h-8 text-[#e2d4ae] underline decoration-[#cbb88a]/40 underline-offset-4">{mode === 'signin' ? 'Create new account' : 'Back to sign in'}</button></p>}
        <p className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[.12em] text-zinc-500"><ShieldCheck size={14}/>Your account. Your access.</p>
      </div>
    </section>
  );
}
