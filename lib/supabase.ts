import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import 'server-only';
import { AuthError } from './auth-errors';

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project') || key.includes('your-anon')) {
    throw new AuthError(503, 'Authentication is not configured.', 'AUTH_UNAVAILABLE');
  }
  return { url, key };
}

export async function getSupabaseClient() {
  const jar = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server components are read-only; middleware persists refresh cookies. */ }
      },
    },
  });
}

// Deliberately unavailable to browser bundles. Only trusted payment orchestration uses this.
export function getServiceRoleSupabaseClient() {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('your-service')) throw new AuthError(503, 'Payment storage is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
