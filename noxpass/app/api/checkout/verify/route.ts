import { NextResponse } from 'next/server';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { createOrderAndTickets } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      event_id,
      source_code,
      quantity,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // 1. SECURE SERVER-SIDE SIGNATURE VERIFICATION
    const isValidSignature = verifyRazorpayPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      console.error('SERVER PAYMENT VERIFICATION FAILED: Invalid HMAC Signature');
      return NextResponse.json(
        { success: false, error: 'Payment signature verification failed server-side.' },
        { status: 400 }
      );
    }

    // 2. CREATE ORDER & GENERATE DIGITAL QR TICKETS IN DATABASE
    const { order, tickets } = await createOrderAndTickets({
      customer_name,
      customer_email,
      customer_phone,
      event_id,
      source_code,
      quantity: Number(quantity) || 1,
      razorpay_order_id,
      razorpay_payment_id,
    });

    return NextResponse.json({
      success: true,
      order,
      tickets,
    });
  } catch (error: any) {
    console.error('Error verifying payment server-side:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment verification server error' },
      { status: 500 }
    );
  }
}
