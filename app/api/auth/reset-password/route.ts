import { NextResponse } from 'next/server';
import { apiError, checkOrigin, jsonBody, onlyFields } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['password']);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) throw new AuthError(400, 'Use a password between 12 and 256 characters.');
    const { client } = await requireRole('customer');
    const { error } = await client.auth.updateUser({ password: body.password });
    if (error) throw new AuthError(400, 'Your password could not be updated. Use a different password that meets the account password policy, or request a new reset link.');
    return NextResponse.json({ message: 'Your password has been updated. You can now access your passes.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
