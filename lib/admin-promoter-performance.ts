'use server';
import {getAdminPerformanceData} from './admin-performance';
export async function getAdminPromoterPerformance() {
  const data=await getAdminPerformanceData();
  return {orders:data.orders.map(o=>({id:o.id,event_id:o.event_id,source_code:o.source_code,subtotal:o.subtotal,quantity:o.quantity,payment_status:o.payment_status,created_at:o.created_at,promoter_commission_percentage:o.promoter_commission_percentage})),tickets:data.tickets.map(t=>({order_id:t.order_id,status:t.status}))};
}
