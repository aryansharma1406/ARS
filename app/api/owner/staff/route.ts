import { apiError,checkOrigin,jsonBody,onlyFields } from '@/lib/api';
import { requireOwner,requireVenueAccess } from '@/lib/auth';
import { addVenueStaffAssignment,updateVenueStaffAssignment } from '@/lib/store';
import type { VenueStaffAssignment } from '@/lib/types';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    checkOrigin(request); await requireOwner();
    const body = await jsonBody(request);
    onlyFields(body,['user_id','venue_id','event_id','gate_name','active']);
    await requireVenueAccess(String(body.venue_id || ''));
    const assignment = await addVenueStaffAssignment({...body,event_id:body.event_id || undefined} as unknown as Omit<VenueStaffAssignment,'id'|'created_at'>);
    return NextResponse.json({assignment},{status:201});
  } catch(error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request); await requireOwner();
    const body = await jsonBody(request);
    onlyFields(body,['id','venue_id','active']);
    await requireVenueAccess(String(body.venue_id || ''));
    const assignment = await updateVenueStaffAssignment(String(body.id || ''), {active:body.active as boolean}, String(body.venue_id));
    return NextResponse.json({assignment});
  } catch(error) { return apiError(error); }
}
