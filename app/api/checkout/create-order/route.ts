import { apiError,checkOrigin,dbError,jsonBody,onlyFields } from '@/lib/api';
import { AuthError,requireRole } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const customer = await requireRole('customer');
    const body = await jsonBody(request);
    onlyFields(body,['eventId','quantity','sourceCode','couponCode','expectedTotal','customer_name','customer_phone']);
    if (body.couponCode != null && typeof body.couponCode !== 'string') throw new AuthError(400,'Enter a valid coupon.');
    if (typeof body.expectedTotal !== 'number' || !Number.isFinite(body.expectedTotal) || body.expectedTotal <= 0) throw new AuthError(400,'Refresh checkout to get the latest total.');
    if (body.sourceCode != null && typeof body.sourceCode !== 'string') throw new AuthError(400,'Enter a valid promoter code.');
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode.trim() : null;
    if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity<1 || body.quantity>10) throw new AuthError(400,'Choose between 1 and 10 tickets.');
    const client = getServiceRoleSupabaseClient();
    const {data:order,error}=await client.rpc('reserve_order_with_coupon',{target_customer:customer.userId,target_event:body.eventId,ticket_quantity:body.quantity,guest_name:body.customer_name,guest_phone:body.customer_phone,referral_code:sourceCode || null,discount_code:body.couponCode || null,expected_total:body.expectedTotal});
    if (error?.code === '22023' && (error.message.startsWith('Coupon:') || error.message.startsWith('Checkout total changed'))) throw new AuthError(400,error.message);
    if (error?.code === '22023' && error.message === 'Invalid referral for this venue') throw new AuthError(400,'This referral link is no longer valid for this venue. Remove the referral below to continue.');
    dbError(error);
    const razorpayOrder=await createRazorpayOrder(Number(order.total),order.id);
    const {error:bindError}=await client.rpc('bind_payment_order',{target_customer:customer.userId,target_order:order.id,provider_order:razorpayOrder.id});
    dbError(bindError);
    return NextResponse.json({success:true,razorpayOrder});
  } catch(error) { return apiError(error); }
}
