import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { AuthError } from '@/lib/auth-errors';

export const dynamic = 'force-dynamic';

export default async function AccessDenied({searchParams}:{searchParams:Promise<{reason?:string}>}) {
  const {reason}=await searchParams;
  let ownerAccessRestored = false;
  if (reason === 'assignment') {
    try {
      // Recheck the current session and live assignments on every refresh.
      // Keep the session intact while all assigned venues are disabled.
      await requireOwner();
      ownerAccessRestored = true;
    } catch (error) {
      if (!(error instanceof AuthError) || ![401, 403].includes(error.status)) throw error;
    }
  }
  // Redirect outside the catch: Next.js implements redirects by throwing.
  if (ownerAccessRestored) redirect('/owner');

  return <main className="mx-auto max-w-xl px-4 py-16 text-white"><h1 className="text-3xl font-bold">Access unavailable</h1><p className="mt-4 text-zinc-400">{reason==='assignment'?'Your account needs an active venue assignment. Once your ARS administrator enables a venue, refresh this page or check access below. You do not need to sign out.':'Authentication is not configured. Contact your ARS administrator.'}</p>{reason === 'assignment' && <a href="/access-denied?reason=assignment" className="ars-button mt-6">Check access again</a>}<form action="/api/auth/logout" method="post"><button className="ars-button ars-button-secondary mt-6">Sign out</button></form></main>;
}
