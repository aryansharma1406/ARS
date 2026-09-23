import {requirePage,requireRole} from '@/lib/auth';
import ManualUpiPayments from '@/components/ManualUpiPayments';
export const dynamic='force-dynamic';
export default async function PaymentPage({searchParams}:{searchParams:Promise<{order?:string}>}){
 await requirePage(()=>requireRole('customer'),'/login','/account/payments');
 const {order}=await searchParams;
 return <ManualUpiPayments orderId={order}/>;
}
