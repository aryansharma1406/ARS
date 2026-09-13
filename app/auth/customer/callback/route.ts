import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { customerCallback, customerDestination } from '@/lib/customer-auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = customerCallback(request).origin;
  const next = customerDestination(url.searchParams.get('next'));
  const failure = (code: string) => {
    const login = new URL('/login', origin);
    login.searchParams.set('error', code);
    login.searchParams.set('next', next);
    return NextResponse.redirect(login, { headers: { 'Cache-Control': 'private, no-store' } });
  };
  if (url.searchParams.has('error')) return failure('oauth_cancelled');
  const code = url.searchParams.get('code');
  if (!code) return failure('auth_callback');
  try {
    const client = await getSupabaseClient();
    const flowId = url.searchParams.get('sb_flow_id');
    const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) return failure('auth_callback');
    try {
      const customer = await requireRole('customer');
      if (!customer.name?.trim() && url.searchParams.get('flow') !== 'recovery') {
        const onboarding = `/account/onboarding?next=${encodeURIComponent(next)}`;
        return NextResponse.redirect(new URL(`/account/location?next=${encodeURIComponent(onboarding)}`, origin), { headers: { 'Cache-Control': 'private, no-store' } });
      }
    } catch {
      await client.auth.signOut({ scope: 'local' });
      return failure('customer_access');
    }
    const destination = url.searchParams.get('flow') === 'recovery' ? '/reset-password' : `/account/location?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(new URL(destination, origin), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return failure('auth_callback'); }
}
