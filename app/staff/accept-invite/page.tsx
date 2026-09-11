'use client';
import { useEffect, useState } from 'react';
export default function AcceptStaffInvite() {
  const [credentials, setCredentials] = useState({ token: '', access_token: '', refresh_token: '' });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    setCredentials({ token: url.searchParams.get('token') || '', access_token: hash.get('access_token') || '', refresh_token: hash.get('refresh_token') || '' });
    if (hash.has('error')) setError('This email link is invalid or expired. Ask your venue owner to resend the invitation.');
    window.history.replaceState(null, '', '/staff/accept-invite');
  }, []);
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/staff/accept-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign('/staff/scanner');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to accept invitation.'); setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-5 py-20"><form onSubmit={accept} className="ars-card space-y-6 p-8"><p className="eyebrow">ARS / Staff invitation</p><h1 className="text-3xl font-bold">Welcome to door operations</h1><p className="text-sm leading-6 text-zinc-400">Set your personal password to accept scanner access for your assigned venue. Accepting changes a customer account to a staff account. Use a separate email if you also need customer access.</p>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<label className="block space-y-2"><span>New password</span><input className="ars-input" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block space-y-2"><span>Confirm password</span><input className="ars-input" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><button disabled={busy || !credentials.token} className="ars-button w-full">{busy ? 'Setting up access...' : 'Accept invitation'}</button><p className="text-xs text-zinc-500">Invitation access expires after 24 hours. The email sign-in link may expire sooner.</p></form></main>;
}
