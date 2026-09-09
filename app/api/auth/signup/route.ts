import { apiError,checkOrigin,jsonBody,onlyFields } from '@/lib/api';
import { AuthError } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['email','password']);
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) throw new AuthError(400, 'Use a valid email and a password of at least 12 characters.');
    const client = await getSupabaseClient();
    const { error } = await client.auth.signUp({ email: body.email.trim(), password: body.password });
    if (error) throw new AuthError(400, 'Account registration could not be completed.');
    return NextResponse.json({ success: true, message: 'Check your email to confirm your account, then sign in.' });
  } catch (error) { return apiError(error); }
}
