'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
export default function OperationsRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) startTransition(() => router.refresh()); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [router]);
  return <div className="mb-5 flex items-center justify-between gap-3 text-xs text-zinc-500"><span>Live view / refreshes every 30 seconds while visible</span><button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="text-[#e2d4ae]">{pending ? 'Refreshing...' : 'Refresh now'}</button></div>;
}
