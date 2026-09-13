'use server';
import { requireRole } from './auth';
import { getSupabaseClient } from './supabase';
import { dbError } from './api';
export async function discoveryVenues() {
 const client = await getSupabaseClient();
 const { data, error } = await client.rpc('discovery_venue_locations');
 return { venues: error ? [] : (data || []) as {id:string;name:string;location:string;latitude:number|null;longitude:number|null}[], unavailable: !!error };
}
export async function completeCustomerProfile(name: string, email: string, area = '') {
 const auth = await requireRole('customer');
 if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || typeof email !== 'string' || typeof area !== 'string' || area.length > 120) throw new Error('Enter your name, up to 120 characters.');
 if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254)) throw new Error('Enter a valid email or leave it empty.');
 const result = await auth.client.rpc('complete_customer_onboarding', {customer_name:name.trim(),selected_area:area});
 if (result.error && ['PGRST202','PGRST205','42P01','42883'].includes(result.error.code || '')) {
   throw new Error('Profile setup is temporarily unavailable. ARS needs to apply the customer onboarding database migration. Your existing account and passes are still available below; your changes have not been saved.');
 }
 dbError(result.error);
 if (email.trim() && email.trim().toLowerCase() !== auth.email.toLowerCase()) {
   const update = await auth.client.auth.updateUser({email:email.trim().toLowerCase()});
   if (update.error) return {emailPending:false,warning:'Your name is saved, but the email could not be added. You can add it later in Account. If it belongs to an existing ARS account, sign in to that account instead.'};
   return {emailPending:true,warning:''};
 }
 return {emailPending:false,warning:''};
}
