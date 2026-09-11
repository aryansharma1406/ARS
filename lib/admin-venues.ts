'use server';

import { requireAdmin } from './auth';
import { dbError } from './api';
import type { Venue } from './types';
import { revalidatePath } from 'next/cache';

function venueSetupError(error: { code?: string } | null) {
  return error && ['PGRST202', 'PGRST204', '42883', '42703', '42P01'].includes(error.code || '')
    ? 'Venue owner setup is incomplete. Run supabase/repair-venue-owner-contacts.sql in your Supabase SQL Editor, then save this form again. Do not run the full database setup.'
    : null;
}

export async function createVenueWithOwner(
  payload: Omit<Venue, 'id' | 'created_at'>,
  owner: { name: string; email: string; phone: string } | null,
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireAdmin();
  // Use the same atomic, venue-scoped contact save for creation and editing.
  // Older deployed creation RPCs may still update the shared login profile.
  const { error } = await client.rpc('admin_save_venue_details', { target_id: null, payload, owner });
  const setupError = venueSetupError(error);
  if (setupError) return { success: false, error: setupError };
  if (error?.code === 'P0001' && error.message.startsWith('Owner:')) {
    return { success: false, error: error.message };
  }
  dbError(error);
  revalidatePath('/owner', 'layout');
  revalidatePath('/admin/venues');
  return { success: true };
}

export async function editAdminVenue(
  id: string,
  payload: Partial<Venue>,
  owner: { name: string; email: string; phone: string } | null,
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_save_venue_details', { target_id: id, payload, owner });
  const setupError = venueSetupError(error);
  if (setupError) return { success: false, error: setupError };
  if (error?.code === 'P0001') return { success: false, error: error.message };
  dbError(error);
  revalidatePath('/owner', 'layout');
  revalidatePath('/admin/venues');
  return { success: true };
}

export async function deleteAdminVenue(id: string): Promise<void> {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_delete_venue', { target_id: id });
  dbError(error);
}
