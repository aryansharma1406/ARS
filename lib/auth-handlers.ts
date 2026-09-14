import { NextResponse } from 'next/server';
import 'server-only';
import { apiError,checkOrigin,jsonBody,safeNext } from './api';
import { AuthError } from './auth';
import { getSupabaseClient } from './supabase';
import {registerPortalSession,recordPortalLogout} from './portal-sessions';

export async function login(request: Request, portal?: 'owner'|'staff'|'admin') {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 256) throw new AuthError(400, 'Email and password are required.');
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error) throw new AuthError(401, 'Sign-in failed. Check your credentials.');
    try {
      // Password sign-in has just verified this Supabase identity. Reusing that
      // verified response avoids a second Auth API round trip before redirecting.
      if (!data.user) throw new AuthError(503, 'Sign-in could not be verified.');
      const { data: profile, error: profileError } = await client.from('users').select('role,active').eq('id', data.user.id).maybeSingle();
      if (profileError) throw new AuthError(503, 'Account verification is unavailable.');
      if (!profile?.active) throw new AuthError(403, 'Your account is inactive or has not been provisioned.', 'ACCOUNT_INACTIVE');
      const role = profile.role;
      const permitted = portal === 'owner' ? role === 'venue_owner'
        : portal === 'staff' ? role === 'staff'
        : portal === 'admin' ? role === 'admin' || role === 'super_admin'
        : role === 'customer';
      if (!permitted) throw new AuthError(403, 'This account cannot access this area.');
      if(portal==='owner'||portal==='admin'){
        if(!data.session)throw new AuthError(503,'Sign-in session unavailable.');
        await registerPortalSession(data.user.id,data.session.access_token,portal,request);
      }
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
    await recordPortalLogout(client);
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new AuthError(503, 'Sign-out could not be completed.');
    const response = NextResponse.redirect(new URL(destination, request.url), 303);
    response.cookies.set('ars_owner_session', '', { expires: new Date(0), path: '/', httpOnly: true });
    return response;
  } catch (error) { return apiError(error); }
}
