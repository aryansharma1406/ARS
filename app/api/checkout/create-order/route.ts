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
    onlyFields(body,['eventId','quantity','sourceCode','customer_name','customer_phone']);
    if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity<1 || body.quantity>10) throw new AuthError(400,'Choose between 1 and 10 tickets.');
    const client = getServiceRoleSupabaseClient();
    const {data:order,error}=await client.rpc('reserve_order',{target_customer:customer.userId,target_event:body.eventId,ticket_quantity:body.quantity,guest_name:body.customer_name,guest_phone:body.customer_phone,referral_code:body.sourceCode || null});
    dbError(error);
    const razorpayOrder=await createRazorpayOrder(Number(order.total),order.id);
    const {error:bindError}=await client.rpc('bind_payment_order',{target_customer:customer.userId,target_order:order.id,provider_order:razorpayOrder.id});
    dbError(bindError);
    return NextResponse.json({success:true,razorpayOrder});
  } catch(error) { return apiError(error); }
}
