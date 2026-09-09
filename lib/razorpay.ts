import crypto from 'crypto';
import Razorpay from 'razorpay';
import 'server-only';
import { AuthError } from './auth-errors';
function configuration() {
  const keyId=process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret=process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes('noxpass') || keySecret.includes('noxpass')) throw new AuthError(503,'Payments are not configured.');
  return {keyId,keySecret};
}
function paymentClient() {
  const {keyId,keySecret}=configuration();
  return new Razorpay({key_id:keyId,key_secret:keySecret});
}
export async function createRazorpayOrder(amountInINR:number,receiptId:string) {
  const {keyId}=configuration();
  const amount=Math.round(amountInINR*100);
  if (!Number.isSafeInteger(amount) || amount<=0) throw new AuthError(400,'Invalid order amount.');
  const order=await paymentClient().orders.create({amount,currency:'INR',receipt:receiptId,notes:{platform:'ARS Nightlife Ticketing'}});
  return {id:order.id,amount:Number(order.amount),currency:order.currency,receipt:receiptId,key_id:keyId};
}
export function verifyRazorpayPaymentSignature(params:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string}) {
  const {keySecret}=configuration();
  if (!/^order_[a-zA-Z0-9]+$/.test(params.razorpay_order_id) || !/^pay_[a-zA-Z0-9]+$/.test(params.razorpay_payment_id) || !/^[a-f0-9]{64}$/.test(params.razorpay_signature)) return false;
  const expected=crypto.createHmac('sha256',keySecret).update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`).digest();
  return crypto.timingSafeEqual(expected,Buffer.from(params.razorpay_signature,'hex'));
}
export async function verifyCapturedPayment(orderId:string,paymentId:string,amount:number) {
  const payment=await paymentClient().payments.fetch(paymentId);
  if (payment.order_id!==orderId || payment.status!=='captured' || payment.currency!=='INR' || Number(payment.amount)!==Math.round(amount*100)) throw new AuthError(400,'Payment is not captured for this order and amount.');
  return Number(payment.amount);
}
