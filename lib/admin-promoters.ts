'use server';

import { requireAdmin } from './auth';
import { dbError } from './api';

export async function createPromoterCode(input: {
  name: string;
  code: string;
  venue_id: string;
  commission_percentage: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireAdmin();
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  if (!name || !code || !input.venue_id || !Number.isFinite(input.commission_percentage)
    || input.commission_percentage < 0 || input.commission_percentage > 100) {
    return { success: false, error: 'Enter a promoter name, code, venue and commission between 0 and 100%.' };
  }
  const { error } = await client.rpc('admin_create_source', { payload: {
    name, code, venue_id: input.venue_id, commission_percentage: input.commission_percentage, active: true,
  } });
  if (error?.code === '23505') {
    return { success: false, error: 'This promoter code already exists. Codes must be unique across all venues. Choose a different code, such as ARYAN-TITOS.' };
  }
  dbError(error);
  return { success: true };
}
