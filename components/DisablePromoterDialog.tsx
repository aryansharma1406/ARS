'use client';

import { useEffect, useRef } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function DisablePromoterDialog({ name, code, busy, error, onCancel, onConfirm }: {
  name: string;
  code: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialog} aria-labelledby="disable-promoter-title" aria-describedby="disable-promoter-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-sm border border-[#cbb88a]/25 bg-[#111110] p-0 text-[#f3efe5] shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm">
    <div className="border-b border-white/10 px-6 py-5 sm:px-8">
      <div className="flex items-center justify-between"><span className="eyebrow">Promoter access</span><button type="button" aria-label="Close confirmation" disabled={busy} onClick={onCancel} className="flex h-10 w-10 items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40"><X size={18}/></button></div>
      <ShieldAlert className="mt-3 text-[#cbb88a]" size={28} strokeWidth={1.5}/>
      <h2 id="disable-promoter-title" className="mt-4 text-2xl font-bold tracking-tight">Disable this promoter?</h2>
    </div>
    <div className="space-y-5 px-6 py-6 sm:px-8">
      <div className="border-l-2 border-[#cbb88a] bg-white/[.03] px-4 py-3"><p className="font-semibold">{name}</p><p className="mt-1 break-all font-mono text-xs text-[#cbb88a]">{code}</p></div>
      <p id="disable-promoter-description" className="text-sm leading-6 text-zinc-400">New bookings will no longer be accepted through this referral link. Existing paid bookings and earned commission will be retained. You can re-enable the promoter at any time.</p>
      {error && <p role="alert" className="border-l-2 border-red-400 bg-red-950/20 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <button type="button" autoFocus disabled={busy} onClick={onCancel} className="ars-button ars-button-secondary">Cancel</button>
        <button type="button" disabled={busy} onClick={onConfirm} className="ars-button">{busy ? 'Disabling...' : 'Disable promoter'}</button>
      </div>
    </div>
  </dialog>;
}
