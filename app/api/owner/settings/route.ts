import { apiError,checkOrigin,jsonBody,onlyFields } from '@/lib/api';
import { requireOwner,requireVenueAccess } from '@/lib/auth';
import { updateOwnerNotificationPreferences,updateVenue } from '@/lib/store';
import { NextResponse } from 'next/server';
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const owner = await requireOwner();
    const body = await jsonBody(request);
    onlyFields(body,['venue_id','name','address','description','image','email','sales','settlements','events']);
    const venueId = String(body.venue_id || '');
    await requireVenueAccess(venueId);
    await updateVenue(venueId,{name:String(body.name || '').trim(),address:String(body.address || '').trim(),description:String(body.description || '').trim(),image:String(body.image || '').trim()});
    await updateOwnerNotificationPreferences(owner.userId,{email:body.email as boolean,sales:body.sales as boolean,settlements:body.settlements as boolean,events:body.events as boolean});
    return NextResponse.json({success:true});
  } catch(error) { return apiError(error); }
}
