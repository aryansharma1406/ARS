import { NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, eventId, sourceCode } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid order amount' }, { status: 400 });
    }

    const receiptId = `rcpt_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder(amount, receiptId);

    return NextResponse.json({
      success: true,
      razorpayOrder,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
