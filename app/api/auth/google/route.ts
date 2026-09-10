import { NextResponse } from 'next/server';
import { apiError, checkOrigin, jsonBody, onlyFields } from '@/lib/api';
import { AuthError } from '@/lib/auth-errors';
import { customerCallback, customerDestination } from '@/lib/customer-auth';
import { getSupabaseClient, supabaseConfig } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['next']);
    const { url, key } = supabaseConfig();
    // Read the provider's actual status rather than offering a demo login or a stale UI flag.
    const settings = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!settings.ok) throw new AuthError(503, 'Google sign-in is temporarily unavailable. Please use email or try again.');
    const config = await settings.json();
    if (config.external?.google !== true) {
      throw new AuthError(503, 'Google sign-in is not configured yet. Enable Google in Supabase Auth and configure its client credentials and redirect URLs. You can still sign in with email.', 'GOOGLE_NOT_CONFIGURED');
    }
    const callback = customerCallback(request);
    callback.searchParams.set('next', customerDestination(body.next));
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new AuthError(503, 'Google sign-in could not start. Please try again.');
    return NextResponse.json({ url: data.url }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
