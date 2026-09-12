import 'server-only';
import { cache } from 'react';
import { requireAdmin } from '@/lib/auth';
import { dbError } from '@/lib/api';
import type { Venue } from '@/lib/types';

type PerformanceEvent = {id:string;venue_id:string;name:string;date:string;start_time:string;end_time:string;published:boolean};
type PerformanceOrder = {id:string;event_id:string;customer_id:string;quantity:number;subtotal:number;payment_status:string;source_code:string|null;razorpay_payment_id:string|null;created_at:string;promoter_commission_percentage?:number|null};
type PerformanceTicket = {id:string;order_id:string;event_id:string;status:string;ticket_type:string;scanned_at:string|null};
type PerformanceSource = {id:string;venue_id:string;name:string;code:string;commission_percentage:number};
export const getAdminPerformanceData = cache(async () => {
  const auth=await requireAdmin();
  const venueResult=await auth.client.rpc('business_venues');
  dbError(venueResult.error);
  // Explicit projections and pagination: no QR credentials or customer contact data leave this helper.
  async function read<T>(table:string,columns:string):Promise<T[]> {
    const rows:T[]=[];
    for(let offset=0;;offset+=1000) {
      const result=await auth.client.from(table).select(columns).order('id').range(offset,offset+999);
      dbError(result.error);
      const page=(result.data||[]) as unknown as T[];
      rows.push(...page);
      if(page.length<1000) return rows;
    }
  }
  const events=await read<PerformanceEvent>('events','id,venue_id,name,date,start_time,end_time,published');
  const orders=await read<PerformanceOrder>('orders','id,event_id,customer_id,quantity,subtotal,payment_status,source_code,razorpay_payment_id,created_at,promoter_commission_percentage');
  const tickets=await read<PerformanceTicket>('tickets','id,order_id,event_id,status,ticket_type,scanned_at');
  const sources=await read<PerformanceSource>('sources','id,venue_id,name,code,commission_percentage');
  return {venues:(venueResult.data||[]) as Venue[],events,orders,tickets,sources};
});
export type PerformanceData = Awaited<ReturnType<typeof getAdminPerformanceData>>;
export const periodDays=(value?:string)=>value==='7'?7:value==='90'?90:30;
export const performanceMoney=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(value);
export function venuePerformance(data:PerformanceData,venueId:string,days:number,now:number) {
  const events=data.events.filter(event=>event.venue_id===venueId);
  const eventIds=new Set(events.map(event=>event.id));
  const start=now-days*86400000;
  const previousStart=start-days*86400000;
  const venueOrders=data.orders.filter(order=>eventIds.has(order.event_id));
  const paid=venueOrders.filter(order=>order.payment_status==='PAID');
  const orders=paid.filter(order=>Date.parse(order.created_at)>=start&&Date.parse(order.created_at)<=now);
  const previous=paid.filter(order=>Date.parse(order.created_at)>=previousStart&&Date.parse(order.created_at)<start);
  const orderIds=new Set(orders.map(order=>order.id));
  const tickets=data.tickets.filter(ticket=>orderIds.has(ticket.order_id));
  const used=tickets.filter(ticket=>ticket.status==='USED');
  const customerVisits=new Map<string,Set<string>>();
  for(const ticket of used) {
    const order=orders.find(order=>order.id===ticket.order_id);
    if(!order?.customer_id) continue;
    if(!customerVisits.has(order.customer_id)) customerVisits.set(order.customer_id,new Set());
    customerVisits.get(order.customer_id)!.add(ticket.event_id);
  }
  const revenue=orders.reduce((sum,order)=>sum+Number(order.subtotal),0);
  const priorRevenue=previous.reduce((sum,order)=>sum+Number(order.subtotal),0);
  const sold=orders.reduce((sum,order)=>sum+Number(order.quantity),0);
  return {events,orders,tickets,used,revenue,priorRevenue,sold,
    attendance:sold?used.length/sold*100:null,
    growth:priorRevenue>0?(revenue-priorRevenue)/priorRevenue*100:null,
    customers:new Set(orders.map(order=>order.customer_id).filter(Boolean)).size,
    repeatCustomers:[...customerVisits.values()].filter(events=>events.size>1).length,
    average:sold?revenue/sold:0,
    testOrders:orders.filter(order=>order.razorpay_payment_id?.startsWith('test_payment_')).length};
}
