import { apiError, checkOrigin, dbError, jsonBody, onlyFields } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { client } = await requireRole('customer');
    const body = await jsonBody(request);
    onlyFields(body, ['eventId', 'tierId', 'quantity', 'couponCode']);
    if(typeof body.tierId!=='string')throw new AuthError(400,'Choose a pass tier.');
    if (typeof body.couponCode !== 'string' || !body.couponCode.trim() || body.couponCode.length > 80
      || typeof body.eventId !== 'string' || !Number.isInteger(body.quantity)) throw new AuthError(400, 'Enter a valid coupon and ticket quantity.');
    const { data, error } = await client.rpc('checkout_tier_quote', {
      target_event: body.eventId, target_tier: body.tierId, ticket_quantity: body.quantity, discount_code: body.couponCode,
    });
    if (error?.code === '22023' && error.message.startsWith('Coupon:')) throw new AuthError(400, error.message);
    dbError(error);
    return NextResponse.json({ valid: true, quote: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
