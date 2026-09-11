import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { apiError, checkOrigin, dbError, jsonBody, onlyFields } from '@/lib/api';
import { AuthError, requireVenueAccess } from '@/lib/auth';
import { supabaseConfig } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const venue = new URL(request.url).searchParams.get('venue') || '';
    const owner = await requireVenueAccess(venue);
    const { data, error } = await owner.client.from('staff_invitations').select('id,name,email,phone,event_id,gate_name,status,assignment_id,expires_at').eq('venue_id', venue).order('created_at', { ascending: false });
    dbError(error);
    return NextResponse.json({ invitations: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['id','venue_id','event_id','name','email','phone','gate_name','action']);
    const owner = await requireVenueAccess(String(body.venue_id || ''));
    const { id, ...payload } = body;
    let email = String(body.email || '').trim().toLowerCase();
    const sending = !id || body.action === 'resend';
    const token = randomBytes(32).toString('hex');
    if (sending) {
      if (id) {
        const row = await owner.client.from('staff_invitations').select('email').eq('id', id).eq('venue_id', body.venue_id).single();
        dbError(row.error);
        email = row.data!.email;
      }
      payload.token_hash = createHash('sha256').update(token).digest('hex');
    }
    const result = await owner.client.rpc('manage_staff_invitation', { payload, target_id: id || null });
    if (result.error?.code === '23505') throw new AuthError(400, 'This email already has an invitation for this venue. Use its existing record.');
    if (result.error?.code === '22023') throw new AuthError(400, result.error.message);
    dbError(result.error);
    if (sending) {
      const { url, key } = supabaseConfig();
      const mailer = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' } });
      const origin = process.env.NODE_ENV === 'development' ? new URL(request.url).origin : new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
      const sent = await mailer.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${origin}/staff/accept-invite?token=${token}` } });
      if (sent.error) throw new AuthError(503, 'Invitation saved, but email delivery failed. Check Supabase email settings, then resend after one minute.');
    }
    return NextResponse.json({ success: true, message: sending ? 'Invitation email requested. Ask the staff member to check their inbox.' : 'Staff access updated.' });
  } catch (error) { return apiError(error); }
}
