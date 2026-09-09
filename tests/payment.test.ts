import { beforeEach,it,expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
beforeEach(()=>{process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID='rzp_test_valid';process.env.RAZORPAY_KEY_SECRET='test-secret-only';});
it('verifies real HMAC bytes and rejects altered/short signatures',()=>{
 const args={razorpay_order_id:'order_abc123',razorpay_payment_id:'pay_abc123',razorpay_signature:crypto.createHmac('sha256','test-secret-only').update('order_abc123|pay_abc123').digest('hex')};
 expect(verifyRazorpayPaymentSignature(args)).toBe(true);
 expect(verifyRazorpayPaymentSignature({...args,razorpay_payment_id:'pay_OTHER'})).toBe(false);
 expect(verifyRazorpayPaymentSignature({...args,razorpay_signature:'bad'})).toBe(false);
});
it('rejects former mock bypasses and fails closed without secrets',()=>{
 expect(verifyRazorpayPaymentSignature({razorpay_order_id:'order_mock_123',razorpay_payment_id:'pay_mock_123',razorpay_signature:'mock_sig'})).toBe(false);
 delete process.env.RAZORPAY_KEY_SECRET;
 expect(()=>verifyRazorpayPaymentSignature({razorpay_order_id:'order_valid',razorpay_payment_id:'pay_valid',razorpay_signature:'mock_sig'})).toThrow('Payments are not configured.');
});
