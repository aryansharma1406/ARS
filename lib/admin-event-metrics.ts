'use server';
import {getAdminPerformanceData} from './admin-performance';
export async function getAdminEventMetrics() {
  const data=await getAdminPerformanceData();
  return data.events.map(event=>{
    const orders=data.orders.filter(order=>order.event_id===event.id&&order.payment_status==='PAID');
    const ids=new Set(orders.map(order=>order.id));
    return {id:event.id,revenue:orders.reduce((sum,order)=>sum+Number(order.subtotal),0),sold:orders.reduce((sum,order)=>sum+Number(order.quantity),0),checkins:data.tickets.filter(ticket=>ids.has(ticket.order_id)&&ticket.status==='USED').length};
  });
}
