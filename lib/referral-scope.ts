import 'server-only';
import { getServiceRoleSupabaseClient } from './supabase';
import { dbError } from './api';

export async function getReferralScope(code: string) {
  const { data, error } = await getServiceRoleSupabaseClient().from('sources')
    .select('venue_id,event_ids').eq('code', code.trim().toUpperCase()).eq('active', true).maybeSingle();
  dbError(error);
  return data as { venue_id: string; event_ids: string[] } | null;
}
