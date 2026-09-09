import { NextResponse } from 'next/server';
import 'server-only';
import { AuthError } from './auth-errors';

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (!origin || origin !== allowed || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AuthError(403, 'Request origin denied.');
  }
}
export async function jsonBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AuthError(400, 'Expected JSON.');
  const body = await request.text();
  if (body.length > 16000) throw new AuthError(400, 'Request is too large.');
  try {
    const value = JSON.parse(body);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new AuthError(400, 'Invalid JSON body.'); }
}
export function apiError(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
  return NextResponse.json({ error: 'The request could not be completed.' }, { status: 500 });
}
export function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (['PGRST200','PGRST202','PGRST205','42P01','42703','42883'].includes(error.code || '')) {
    throw new AuthError(503, 'Database setup is incomplete. Apply the ARS Supabase migrations.', 'DATABASE_SETUP_REQUIRED');
  }
  if (error.code === '42501') throw new AuthError(403, 'Resource access denied.');
  if (['22023','23514','22P02','23503'].includes(error.code || '')) throw new AuthError(400, 'Invalid request or resource scope.');
  if (['23505','P0001'].includes(error.code || '')) throw new AuthError(409, 'The operation conflicts with the current resource state.');
  throw new AuthError(503, 'Data service is unavailable.', 'DATABASE_UNAVAILABLE');
}
export function onlyFields(body: Record<string, unknown>, fields: string[]) {
  if (Object.keys(body).some(key => !fields.includes(key))) throw new AuthError(400, 'Request includes a protected or unsupported field.');
}
export function safeNext(value: unknown, fallback: string) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value) ? value : fallback;
}
