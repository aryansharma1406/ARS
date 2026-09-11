'use server';

import { requireAdmin } from './auth';
import { dbError } from './api';
import { getBusinessVenues, getEvents } from './store';

export interface PromoterRecord {
  id: string; name: string; email: string | null; phone: string | null; code: string;
  venue_id: string; venue_name: string; event_ids: string[]; active: boolean;
  commission_percentage: number; tickets_sold: number; revenue: number; entries: number;
  visits: number; converted_visits: number; earned: number; paid: number;
}
export async function getPromoterDirectory() {
  const { client } = await requireAdmin();
  const [result, venues, events] = await Promise.all([client.rpc('admin_promoter_directory'), getBusinessVenues(), getEvents()]);
  dbError(result.error);
  return { promoters: (result.data || []) as PromoterRecord[], venues, events };
}
export async function savePromoter(payload: { name?: string; email?: string; phone?: string; code?: string; venue_id?: string; commission_percentage?: number; event_ids?: string[]; active?: boolean }, id?: string) {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_manage_promoter', { payload, target_id: id || null });
  if (error?.code === '23505') return { error: 'This referral code already exists. Choose a unique code.' };
  if (error?.code === '22023') return { error: error.message };
  dbError(error);
  return { error: null };
}
export async function getPromoterActivity(id: string) {
  const { client } = await requireAdmin();
  const source = await client.from('sources').select('code').eq('id', id).single();
  dbError(source.error);
  if (!source.data) throw new Error('Promoter not found.');
  const [sales, payouts] = await Promise.all([
    client.from('orders').select('id,created_at,quantity,subtotal,discount_amount,payment_status,promoter_commission_percentage').eq('source_code', source.data.code).order('created_at', { ascending: false }).limit(200),
    client.from('promoter_payouts').select('id,amount,reference,paid_at').eq('source_id', id).order('paid_at', { ascending: false }).limit(200),
  ]);
  dbError(sales.error); dbError(payouts.error);
  return { sales: sales.data || [], payouts: payouts.data || [] };
}
