import { apiError,checkOrigin,dbError,jsonBody,onlyFields } from '@/lib/api';
import { AuthError,requireRole } from '@/lib/auth';
import { verifyCapturedPayment,verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const customer = await requireRole('customer');
    const body=await jsonBody(request);
    onlyFields(body,['razorpay_order_id','razorpay_payment_id','razorpay_signature']);
    if (![body.razorpay_order_id,body.razorpay_payment_id,body.razorpay_signature].every(v=>typeof v==='string')) throw new AuthError(400,'Payment verification fields are required.');
    const client=getServiceRoleSupabaseClient();
    const {data:order,error}=await client.from('orders').select('id,total,razorpay_order_id').eq('razorpay_order_id',body.razorpay_order_id).eq('customer_id',customer.userId).maybeSingle();
    dbError(error);
    if (!order) throw new AuthError(403,'Order access denied.');
    const paymentId=body.razorpay_payment_id as string;
    if (!verifyRazorpayPaymentSignature({razorpay_order_id:order.razorpay_order_id,razorpay_payment_id:paymentId,razorpay_signature:body.razorpay_signature as string})) throw new AuthError(400,'Payment signature verification failed.');
    const amount=await verifyCapturedPayment(order.razorpay_order_id,paymentId,Number(order.total));
    const {data,error:fulfillError}=await client.rpc('finalize_payment',{target_customer:customer.userId,provider_order:order.razorpay_order_id,provider_payment:paymentId,captured_amount:amount});
    dbError(fulfillError);
    return NextResponse.json({success:true,...data});
  } catch(error) { return apiError(error); }
}
