import { requireRole } from '@/lib/auth';
import { apiError, checkOrigin, dbError, jsonBody } from '@/lib/api';
import { AuthError } from '@/lib/auth-errors';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const auth = await requireRole('customer');
    const body = await jsonBody(request);
    if (typeof body.eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.eventId) || !['event_view','checkout_start'].includes(String(body.kind))) throw new AuthError(400,'Invalid observation.');
    const {error} = await auth.client.rpc('record_venue_funnel',{target_event:body.eventId,observation_kind:body.kind,referral_source:typeof body.source==='string'?body.source.slice(0,80):null});
    dbError(error);
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
