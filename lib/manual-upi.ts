export const UPI_ID='8087390944@ptaxis';
export const UPI_PAYEE='Aryan Kumar';
export const UPI_QR='/payments/ars-upi.jpeg';
export type PaymentQueue='pending'|'approved'|'rejected'|'expired';
export type ManualPayment={id:string;customer_name:string;customer_email:string;event_name:string;total:number;quantity:number;ticket_type:string;utr:string|null;state:'AWAITING_UTR'|'PENDING'|'VERIFIED'|'REJECTED'|'EXPIRED'|'REFUNDED';expires_at:string;submitted_at:string|null;review_note:string|null;ticket_id:string|null;reviewed_at?:string|null;reviewed_by?:string|null;venue_name?:string;reviewer_name?:string;pass_status?:string};
export type ManualPayments={rows:ManualPayment[];holdMinutes:number;serverTime:string;counts?:Record<PaymentQueue,number>;hasMore?:boolean};
export const paymentLabel=(state:ManualPayment['state'])=>({AWAITING_UTR:'Awaiting Payment Reference',PENDING:'Payment Verification Pending',VERIFIED:'Payment Verified',REJECTED:'Payment Rejected',EXPIRED:'Payment Window Expired',REFUNDED:'Refunded'}[state]);
export const paymentMoney=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
export const paymentTime=(value:string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value));
