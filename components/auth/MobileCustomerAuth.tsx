'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import { customerAuthRedirect } from '@/lib/customer-auth-origin';

type Props = { next?: string; appUrl?: string; errorCode?: string; initialMode?: string; linking?: boolean; emailOnly?: boolean };
export default function MobileCustomerAuth({ next, appUrl, errorCode, initialMode, linking = false, emailOnly = false }: Props) {
  const [channel, setChannel] = useState<'sms' | 'email'>(emailOnly ? 'email' : 'sms');
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [create, setCreate] = useState(initialMode === 'signup');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [whatsapp, setWhatsapp] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(errorCode ? 'That sign-in link could not be completed. Please try again.' : '');
  const [error, setError] = useState(false);
  const [continueTo, setContinueTo] = useState('');
  const [ready, setReady] = useState(!appUrl || linking);
  useEffect(() => {
    if (linking) return;
    try {
      const redirect = customerAuthRedirect(window.location.href, appUrl);
      if (redirect) window.location.replace(redirect);
      else setReady(true);
    } catch { setError(true); setMessage('The secure sign-in address is not configured correctly.'); }
  }, [appUrl, linking]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(n => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function changeChannel(value: 'sms' | 'email') {
    setChannel(value); setIdentifier(''); setToken(''); setSent(false); setMessage(''); setError(false); setCreate(false); setWhatsapp(value === 'sms');
  }
  async function requestCode(verify: boolean) {
    setBusy(true); setMessage(''); setError(false);
    try {
      const response = await fetch('/api/auth/customer-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        action: linking ? verify ? 'link-verify' : 'link-send' : verify ? 'verify' : 'send',
        channel, identifier: identifier.trim(), token, create, next, whatsapp,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification is unavailable. Please try again.');
      if (!verify) { setSent(true); setToken(''); setCooldown(60); setMessage(result.message); }
      else if (result.pending) { setToken(''); setMessage(result.message); }
      else if (result.consentWarning) { setContinueTo(result.next); setMessage(result.consentWarning); }
      else window.location.assign(result.next);
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError(false); setMessage('');
    try {
      const response = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Google sign-in is unavailable.');
      window.location.assign(result.url);
    } catch (failure) { setError(true); setMessage(failure instanceof Error ? failure.message : 'Please try again.'); setBusy(false); }
  }
  return <section className={linking ? 'border border-[#cbb88a]/20 bg-[#cbb88a]/5 p-5 sm:p-8' : 'mx-auto grid min-h-[70svh] max-w-5xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:gap-24'}>
    {!linking && <div className="hidden border-l border-[#cbb88a]/30 pl-8 lg:block"><p className="eyebrow mb-8">ARS / After dark</p><h2 className="text-7xl font-black uppercase leading-[.95] tracking-tighter">Your number.<br/><span className="text-[#e2d4ae]">Your night.</span></h2><p className="mt-6 max-w-xs text-sm leading-7 text-zinc-400">One verified identity. Every night worth remembering. Your passes stay with your account.</p></div>}
    <div className="mx-auto w-full max-w-md">
      <p className="eyebrow mb-4">ARS / Secure access</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{linking ? emailOnly ? 'Add an optional email.' : 'Link your mobile.' : sent ? 'Check your messages.' : 'Your night awaits.'}</h1>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{linking ? 'Verify this contact on your existing account. Your orders, tickets and membership stay together.' : 'Sign in or join with a mobile verification code. No password needed.'}</p>
      {message && <p role={error ? 'alert' : 'status'} className={`mt-5 border-l-2 p-4 text-sm leading-6 ${error ? 'border-red-400 bg-red-950/20 text-red-200' : 'border-[#cbb88a] bg-[#cbb88a]/10 text-[#e2d4ae]'}`}>{message}</p>}
      {continueTo ? <a href={continueTo} className="ars-button mt-5 w-full">Continue <ArrowRight size={16}/></a> : ready && <>
        {!linking && !sent && <div className="my-6 flex gap-3"><button type="button" disabled={busy} onClick={() => changeChannel('sms')} aria-pressed={channel === 'sms'} className={`ars-button ${channel === 'sms' ? '' : 'ars-button-secondary'}`}>Mobile OTP</button><button type="button" disabled={busy} onClick={() => changeChannel('email')} aria-pressed={channel === 'email'} className={`ars-button ${channel === 'email' ? '' : 'ars-button-secondary'}`}>Existing email</button></div>}
        <form onSubmit={e => { e.preventDefault(); void requestCode(sent); }} className="mt-6 space-y-5" aria-busy={busy}>
          <label className="ars-label">{channel === 'sms' ? 'Mobile number with country code' : 'Email address'}<input className="ars-input mt-2" required disabled={busy || sent} type={channel === 'sms' ? 'tel' : 'email'} autoComplete={channel === 'sms' ? 'tel' : 'email'} pattern={channel === 'sms' ? '\\+[1-9][0-9]{7,14}' : undefined} maxLength={channel === 'sms' ? 16 : 254} placeholder={channel === 'sms' ? '+919876543210' : 'you@example.com'} value={identifier} onChange={e => setIdentifier(e.target.value)}/></label>
          {!linking && channel === 'sms' && !sent && <div><div className="grid grid-cols-2 gap-2" role="group" aria-label="Account access"><button type="button" disabled={busy} aria-pressed={!create} onClick={()=>setCreate(false)} className={`ars-button ${create?'ars-button-secondary':''}`}>Sign in</button><button type="button" disabled={busy} aria-pressed={create} onClick={()=>setCreate(true)} className={`ars-button ${create?'':'ars-button-secondary'}`}>Join ARS</button></div><p className="mt-3 text-xs leading-6 text-zinc-500">{create?'New to ARS? Verify your number, then add your name. Email and location are optional.':'Already have passes under email or Google? Use that account first, then link your mobile in Account.'}</p></div>}
          {sent && <label className="ars-label">Verification code<input autoFocus className="ars-input mt-2 text-center text-xl tracking-[.3em]" required disabled={busy} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" maxLength={10} value={token} onChange={e => setToken(e.target.value.replace(/\D/g, ''))}/></label>}
          {channel === 'sms' && <div><label className="flex items-start gap-3 text-sm leading-6 text-zinc-300"><input type="checkbox" className="mt-1 accent-[#cbb88a]" disabled={busy} checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)}/><span>I agree to receive ARS offers and event updates on WhatsApp at this number. Optional.</span></label><p className="mt-2 text-xs leading-5 text-zinc-500">SMS verification is separate from marketing permission. Unchecked leaves existing consent unchanged. <Link href="/account/marketing" className="text-[#cbb88a] underline">Opt out after signing in.</Link></p></div>}
          <button disabled={busy} className="ars-button w-full"><Smartphone size={16}/>{busy ? 'Please wait...' : sent ? 'Verify & continue' : 'Send verification code'}</button>
        </form>
        {sent && <div className="mt-4 flex justify-between gap-4 text-xs text-[#cbb88a]"><button type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode(false)} className="min-h-11 disabled:text-zinc-500">{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button><button type="button" disabled={busy} onClick={() => { setSent(false); setToken(''); setMessage(''); }} className="min-h-11">Change {channel === 'sms' ? 'number' : 'email'}</button></div>}
        {!linking && <><div className="my-7 flex items-center gap-4 text-xs text-zinc-500"><span className="h-px flex-1 bg-white/10"/>or<span className="h-px flex-1 bg-white/10"/></div><button type="button" disabled={busy} onClick={google} className="ars-button ars-button-secondary w-full">Continue with Google</button><p className="mt-5 text-xs leading-6 text-zinc-500">Existing accounts and purchases remain unchanged. Never create a second account to recover missing tickets.</p></>}
        <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck size={15}/>Codes are verified securely by Supabase Auth.</p>
      </>}
    </div>
  </section>;
}
