import { NextResponse } from 'next/server';
import { apiError, checkOrigin, jsonBody, onlyFields } from '@/lib/api';
import { AuthError } from '@/lib/auth-errors';
import { customerCallback } from '@/lib/customer-auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['email']);
    if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) throw new AuthError(400, 'Enter a valid email address.');
    const callback = customerCallback(request);
    callback.searchParams.set('flow', 'recovery');
    const client = await getSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(body.email.trim(), { redirectTo: callback.toString() });
    if (error) throw new AuthError(503, 'A reset email could not be requested. Please try again later.');
    return NextResponse.json({ message: 'If an account exists for this email, you’ll receive a reset link. Open it in this browser to choose a new password.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
