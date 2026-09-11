import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const client = getServiceRoleSupabaseClient();
  const { data: source, error } = await client.from('sources').select('code,venue_id').eq('code', code.trim().toUpperCase()).eq('active', true).maybeSingle();
  if (error) return new NextResponse('Referral service is unavailable. Please try again.', { status: 503 });
  if (!source) return new NextResponse('This referral link is unavailable.', { status: 404 });
  const { data: venue, error: venueError } = await client.from('venues').select('name').eq('id', source.venue_id).eq('active', true).maybeSingle();
  if (venueError) return new NextResponse('Referral service is unavailable. Please try again.', { status: 503 });
  if (!venue) return new NextResponse('This venue is unavailable.', { status: 404 });
  const destination = new URL('/events', request.url);
  destination.searchParams.set('venue', venue.name);
  destination.searchParams.set('source', source.code);
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set('ars_ref_' + source.venue_id, source.code, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 7 * 24 * 60 * 60 });
  return response;
}
