'use server';

import { requireAdmin } from './auth';
import { dbError } from './api';

export async function getCoupons() {
  const { client } = await requireAdmin();
  const { data, error } = await client.from('coupons').select('id,code,discount_type,discount_value,venue_id,expires_at,active').order('created_at', { ascending: false });
  dbError(error);
  return data || [];
}

export async function saveCoupon(payload: { code?: string; discount_type?: string; discount_value?: number; venue_id?: string; expires_at?: string; active?: boolean }, id?: string) {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_save_coupon', { payload, target_id: id || null });
  if (error?.code === '23505') return { error: 'This coupon code already exists.' };
  if (error && ['23514', '23502', '22023', '22P02'].includes(error.code)) return { error: 'Enter a valid coupon. Percentage discounts must be below 100%; amounts must be positive.' };
  dbError(error);
  return { error: null };
}
