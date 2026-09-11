'use server';

import { requireAdmin } from './auth';
import { dbError } from './api';
import type { Venue } from './types';

export async function createVenueWithOwner(
  payload: Omit<Venue, 'id' | 'created_at'>,
  owner: { name: string; email: string; phone: string } | null,
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_create_venue_with_owner', { payload, owner });
  if (error?.code === 'P0001' && error.message.startsWith('Owner:')) {
    return { success: false, error: error.message };
  }
  dbError(error);
  return { success: true };
}

export async function editAdminVenue(
  id: string,
  payload: Partial<Venue>,
  owner: { name: string; email: string; phone: string } | null,
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_save_venue_details', { target_id: id, payload, owner });
  if (error?.code === 'P0001') return { success: false, error: error.message };
  dbError(error);
  return { success: true };
}

export async function deleteAdminVenue(id: string): Promise<void> {
  const { client } = await requireAdmin();
  const { error } = await client.rpc('admin_delete_venue', { target_id: id });
  dbError(error);
}
