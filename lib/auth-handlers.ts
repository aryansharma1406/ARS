import { NextResponse } from 'next/server';
import 'server-only';
import { apiError,checkOrigin,jsonBody,safeNext } from './api';
import { AuthError,requireAdmin,requireOwner,requireRole,requireStaff } from './auth';
import { getSupabaseClient } from './supabase';

export async function login(request: Request, portal?: 'owner'|'staff'|'admin') {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 256) throw new AuthError(400, 'Email and password are required.');
    const client = await getSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error) throw new AuthError(401, 'Sign-in failed. Check your credentials.');
    try {
      if (portal === 'owner') await requireOwner();
      else if (portal === 'staff') await requireStaff();
      else if (portal === 'admin') await requireAdmin();
      else await requireRole('customer');
    } catch (error) {
      await client.auth.signOut({ scope: 'local' });
      throw error;
    }
    const fallback = portal === 'owner' ? '/owner' : portal === 'staff' ? '/staff/scanner' : portal === 'admin' ? '/admin' : '/account/tickets';
    return NextResponse.json({ success: true, next: safeNext(body.next, fallback) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function logout(request: Request, destination = '/login') {
  try {
    checkOrigin(request);
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new AuthError(503, 'Sign-out could not be completed.');
    const response = NextResponse.redirect(new URL(destination, request.url), 303);
    response.cookies.set('ars_owner_session', '', { expires: new Date(0), path: '/', httpOnly: true });
    return response;
  } catch (error) { return apiError(error); }
}
