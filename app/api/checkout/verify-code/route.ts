import { apiError, checkOrigin, dbError, jsonBody, onlyFields } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const customer = await requireRole('customer');
    const body = await jsonBody(request);
    onlyFields(body, ['eventId', 'sourceCode']);
    if (typeof body.eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventId)
      || typeof body.sourceCode !== 'string' || !body.sourceCode.trim()) {
      throw new AuthError(400, 'Enter a promoter code for this event.');
    }
    const code = body.sourceCode.trim().toUpperCase();
    // Check public event eligibility using the customer's RLS-scoped session.
    const { data: event, error: eventError } = await customer.client.from('events')
      .select('venue_id,venues!inner(active)').eq('id', body.eventId)
      .eq('published', true).eq('venues.active', true).maybeSingle();
    dbError(eventError);
    if (!event) throw new AuthError(400, 'This event is not available for booking.');

    // Only expose validity, never the promoter's private details or commission.
    const { data: source, error } = await getServiceRoleSupabaseClient().from('sources')
      .select('id').eq('code', code).eq('venue_id', event.venue_id).eq('active', true).maybeSingle();
    dbError(error);
    if (!source) throw new AuthError(400, 'This code is invalid, inactive, or belongs to another venue.');
    return NextResponse.json({ valid: true, code }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
