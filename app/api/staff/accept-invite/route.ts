import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiError, checkOrigin, dbError, jsonBody, onlyFields } from '@/lib/api';
import { AuthError } from '@/lib/auth-errors';
import { getSupabaseClient } from '@/lib/supabase';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['token','password','access_token','refresh_token']);
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token) || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw new AuthError(400,'Use the invitation link and a password between 12 and 128 characters.');
    const client = await getSupabaseClient();
    if (typeof body.access_token === 'string' && typeof body.refresh_token === 'string') {
      const session = await client.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      if (session.error) throw new AuthError(401,'This email link has expired. Request a new invitation.');
    }
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) throw new AuthError(401,'Open the secure link from your invitation email.');
    const accepted = await client.rpc('accept_staff_invitation', { invitation_hash: createHash('sha256').update(body.token).digest('hex') });
    if (accepted.error?.code === '22023') throw new AuthError(400,accepted.error.message);
    dbError(accepted.error);
    const changed = await client.auth.updateUser({ password: body.password });
    if (changed.error) throw new AuthError(400,'Your assignment was accepted, but the password could not be set. Choose a different strong password and retry.');
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
