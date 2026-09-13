import { apiError,checkOrigin,dbError,jsonBody,onlyFields } from '@/lib/api';
import { AuthError,requireRole } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { testPaymentsEnabled } from '@/lib/test-payments';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const testPayment = testPaymentsEnabled();
    if (testPayment && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) {
      throw new AuthError(403,'Test payments are available on localhost only.');
    }
    const customer = await requireRole('customer');
    const body = await jsonBody(request);
    onlyFields(body,['eventId','tierId','quantity','sourceCode','couponCode','expectedTotal','customer_name','customer_phone']);
    if(typeof body.tierId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.tierId))throw new AuthError(400,'Choose a pass tier.');
    if (body.couponCode != null && typeof body.couponCode !== 'string') throw new AuthError(400,'Enter a valid coupon.');
    if (typeof body.expectedTotal !== 'number' || !Number.isFinite(body.expectedTotal) || body.expectedTotal <= 0) throw new AuthError(400,'Refresh checkout to get the latest total.');
    if (body.sourceCode != null && typeof body.sourceCode !== 'string') throw new AuthError(400,'Enter a valid promoter code.');
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode.trim() : null;
    if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity<1 || body.quantity>10) throw new AuthError(400,'Choose between 1 and 10 tickets.');
    const client = getServiceRoleSupabaseClient();
    let visitId: string | null = null;
    if (sourceCode) {
      const event = await customer.client.from('events').select('venue_id').eq('id', body.eventId).maybeSingle();
      dbError(event.error);
      if (event.data) {
        const value = (await cookies()).get('ars_visit_' + event.data.venue_id)?.value;
        if (value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) visitId = value;
      }
    }
    const {data:order,error}=await client.rpc('reserve_tier_order',{target_customer:customer.userId,target_event:body.eventId,target_tier:body.tierId,ticket_quantity:body.quantity,guest_name:body.customer_name,guest_phone:body.customer_phone,referral_code:sourceCode || null,discount_code:body.couponCode || null,expected_total:body.expectedTotal,visit_id:visitId});
    if(error?.code==='22023'&&(error.message.startsWith('Selected pass')||error.message==='Event has ended.'))throw new AuthError(400,error.message);
    if (error?.code === '22023' && error.message === 'This referral is not available for this event.') throw new AuthError(400,'This referral is not assigned to this event. Remove the referral or choose an assigned event.');
    if (error?.code === '22023' && (error.message.startsWith('Coupon:') || error.message.startsWith('Checkout total changed'))) throw new AuthError(400,error.message);
    if (error?.code === '22023' && error.message === 'Invalid referral for this venue') throw new AuthError(400,'This referral link is no longer valid for this venue. Remove the referral below to continue.');
    dbError(error);
    if (testPayment) {
      const providerOrder = `test_order_${order.id}`;
      const { error: bindError } = await client.rpc('bind_payment_order', {
        target_customer: customer.userId, target_order: order.id, provider_order: providerOrder,
      });
      dbError(bindError);
      const { data: fulfilled, error: fulfillmentError } = await client.rpc('finalize_payment', {
        target_customer: customer.userId,
        provider_order: providerOrder,
        provider_payment: `test_payment_${order.id}`,
        captured_amount: Math.round(Number(order.total) * 100),
      });
      dbError(fulfillmentError);
      return NextResponse.json({ success: true, testPayment: true, tickets: fulfilled.tickets }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    const razorpayOrder=await createRazorpayOrder(Number(order.total),order.id);
    const {error:bindError}=await client.rpc('bind_payment_order',{target_customer:customer.userId,target_order:order.id,provider_order:razorpayOrder.id});
    dbError(bindError);
    return NextResponse.json({success:true,razorpayOrder});
  } catch(error) { return apiError(error); }
}
