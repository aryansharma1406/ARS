import { NextResponse } from 'next/server';
import { apiError, checkOrigin, jsonBody, onlyFields } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';
import { customerDestination } from '@/lib/customer-auth';
import { getSupabaseClient, supabaseConfig } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['action', 'channel', 'identifier', 'token', 'create', 'next', 'whatsapp', 'captchaToken']);
    const action = body.action;
    const channel = body.channel;
    if (!['send', 'verify', 'link-send', 'link-verify'].includes(String(action)) || !['sms', 'email'].includes(String(channel))) throw new AuthError(400, 'Invalid verification request.');
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    if (channel === 'sms' ? !/^\+[1-9][0-9]{7,14}$/.test(identifier) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) || identifier.length > 254) throw new AuthError(400, channel === 'sms' ? 'Enter your mobile number with country code, for example +919876543210.' : 'Enter a valid email address.');
    const linking = action === 'link-send' || action === 'link-verify';
    const verifying = action === 'verify' || action === 'link-verify';
    const auth = linking ? await requireRole('customer') : null;
    const client = auth?.client || await getSupabaseClient();
    if (!verifying) {
      if (channel === 'sms') {
        const { url, key } = supabaseConfig();
        const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: key }, cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        if (!settingsResponse.ok) throw new AuthError(503, 'Mobile sign-in is temporarily unavailable. Please use email or Google.');
        const settings = await settingsResponse.json();
        if (settings.external?.phone !== true) throw new AuthError(503, 'Mobile OTP is not configured yet. ARS must enable Phone authentication and configure an SMS provider in Supabase. Please use email or Google for now.', 'PHONE_NOT_CONFIGURED');
      }
      const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined;
      const result = linking
        ? await client.auth.updateUser(channel === 'sms' ? { phone: identifier } : { email: identifier })
        : channel === 'sms'
          ? await client.auth.signInWithOtp({ phone: identifier, options: { shouldCreateUser: body.create === true, captchaToken } })
          : await client.auth.signInWithOtp({ email: identifier.toLowerCase(), options: { shouldCreateUser: false, captchaToken } });
      if (result.error) {
        if (result.error.status === 429) throw new AuthError(429, 'Please wait before requesting another code.');
        if (result.error.code === 'sms_send_failed') throw new AuthError(503, 'The SMS provider could not deliver your code. Please try email or Google while ARS checks its SMS provider configuration.', 'SMS_DELIVERY_FAILED');
        if (result.error.code === 'unexpected_failure') throw new AuthError(503, 'Account setup could not be completed. ARS support should check the customer mobile-auth migration and Supabase Auth logs.', 'AUTH_SETUP_REQUIRED');
        throw new AuthError(400, linking ? 'Could not send verification. The contact may already belong to an account. Sign in to that account instead; accounts are never merged automatically.' : 'Could not send a code. Existing customers should use their linked mobile or original email/Google login. New customers should select Create account. If this continues, contact ARS support.');
      }
      return NextResponse.json({ success: true, message: channel === 'sms' ? 'Check your SMS for the verification code.' : 'Check your email for the verification code. Email changes may require confirmation at both addresses.' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (typeof body.token !== 'string' || !/^\d{6,10}$/.test(body.token)) throw new AuthError(400, 'Enter the verification code.');
    const { data, error } = channel === 'sms'
      ? await client.auth.verifyOtp({ phone: identifier, token: body.token, type: linking ? 'phone_change' : 'sms' })
      : await client.auth.verifyOtp({ email: identifier.toLowerCase(), token: body.token, type: linking ? 'email_change' : 'email' });
    if (error) throw new AuthError(400, 'The code is incorrect or expired. Request a new code and try again.');
    const verified = await client.auth.getUser();
    const user = verified.data.user || data.user;
    if (verified.error || !user) throw new AuthError(401, 'Verification could not be completed.');
    const { data: profile, error: profileError } = await client.from('users').select('role,active,name').eq('id', user.id).maybeSingle();
    if (profileError || !profile?.active || profile.role !== 'customer' || (auth && user.id !== auth.userId)) {
      await client.auth.signOut({ scope: 'local' });
      throw new AuthError(403, 'This login is for active customer accounts only. Use the dedicated portal for your assigned role.');
    }
    const confirmed = channel === 'sms'
      ? !!user.phone_confirmed_at && `+${(user.phone || '').replace(/^\+/, '')}` === identifier
      : !!user.email_confirmed_at && user.email?.toLowerCase() === identifier.toLowerCase();
    if (!confirmed) return NextResponse.json({ success: true, pending: true, message: 'Confirm the change at both email addresses before it is complete.' }, { headers: { 'Cache-Control': 'private, no-store' } });
    let consentWarning = '';
    if (channel === 'sms' && body.whatsapp === true) {
      const { error: consentError } = await client.rpc('customer_whatsapp_login_consent');
      if (consentError) consentWarning = 'Your login is complete, but WhatsApp consent could not be saved. You can update it later.';
    }
    const destination = customerDestination(body.next);
    const next = linking ? '/account/profile' : !profile.name?.trim() ? `/account/onboarding?next=${encodeURIComponent(destination)}` : destination;
    return NextResponse.json({ success: true, next: linking ? next : `/account/location?next=${encodeURIComponent(next)}`, consentWarning }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
