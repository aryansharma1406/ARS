import { getSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (token && type === 'email') {
    const client = await getSupabaseClient();
    const { error } = await client.auth.verifyOtp({ token_hash: token, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/account/tickets', request.url));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', request.url));
}
