import { NextResponse } from 'next/server';
import { apiError, checkOrigin, dbError, jsonBody, onlyFields } from '@/lib/api';
import { requireOwner, requireVenueAccess } from '@/lib/auth';
export async function GET() {
  try {
    const owner = await requireOwner();
    const result = await owner.client.from('sources').select('id,name,email,phone,code,venue_id,commission_percentage').in('venue_id', owner.venueIds).order('name');
    dbError(result.error);
    return NextResponse.json({ promoters: result.data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request);
    onlyFields(body, ['venue_id','existing_id','name','email','phone','code','event_ids','commission_percentage']);
    const owner = await requireVenueAccess(String(body.venue_id || ''));
    const result = await owner.client.rpc('owner_add_promoter', { payload: body });
    if (result.error?.code === '23505') return NextResponse.json({ error: 'This referral code already exists. Generate or enter another code.' }, { status: 409 });
    if (result.error?.code === '22023') return NextResponse.json({ error: result.error.message }, { status: 400 });
    dbError(result.error);
    return NextResponse.json({ id: result.data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
