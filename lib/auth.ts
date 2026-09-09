import { forbidden,redirect } from 'next/navigation';
import 'server-only';
import { AuthError } from './auth-errors';
import { getSupabaseClient } from './supabase';
import type { UserRole,VenueStaffAssignment } from './types';
export { AuthError } from './auth-errors';

export async function requireAuth() {
  const client = await getSupabaseClient();
  // getSession() and cookie contents are not identity verification.
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new AuthError(401, 'Please sign in.', 'UNAUTHENTICATED');
  const { data: profile, error: profileError } = await client.from('users').select('id,name,email,role,active').eq('id', user.id).maybeSingle();
  if (profileError) throw new AuthError(503, 'Account verification is unavailable.');
  if (!profile || !profile.active) throw new AuthError(403, 'Your account is inactive or has not been provisioned.', 'ACCOUNT_INACTIVE');
  return { userId: user.id, name: profile.name as string, email: user.email || profile.email as string, role: profile.role as UserRole, client };
}

export async function requireRole(...roles: UserRole[]) {
  const auth = await requireAuth();
  if (!roles.includes(auth.role)) throw new AuthError(403, 'This account cannot access this area.');
  return auth;
}
export async function requireAdmin() { return requireRole('admin', 'super_admin'); }

export async function requireOwner() {
  const auth = await requireRole('venue_owner');
  const { data, error } = await auth.client.from('venue_owners').select('venue_id,venues!inner(active)').eq('user_id', auth.userId).eq('active', true).eq('venues.active', true);
  if (error) throw new AuthError(503, 'Venue assignments could not be verified.');
  const venueIds = (data || []).map(row => row.venue_id as string);
  if (!venueIds.length) throw new AuthError(403, 'No active venue assignment. Contact your ARS administrator.', 'ASSIGNMENT_REQUIRED');
  return { ...auth, venueIds };
}

export async function requireVenueAccess(venueId: string) {
  const owner = await requireOwner();
  if (!owner.venueIds.includes(venueId)) throw new AuthError(403, 'Venue access denied.');
  return owner;
}

export async function requireStaff() {
  const auth = await requireRole('staff');
  const { data, error } = await auth.client.from('venue_staff_assignments').select('*,venues!inner(name,active)').eq('user_id', auth.userId).eq('active', true).eq('venues.active', true);
  if (error) throw new AuthError(503, 'Staff assignments could not be verified.');
  const assignments = (data || []) as (VenueStaffAssignment & { venues: { name: string; active: boolean } })[];
  if (!assignments.length) throw new AuthError(403, 'No active staff assignment. Contact your venue administrator.', 'ASSIGNMENT_REQUIRED');
  return { ...auth, assignments };
}

export async function requirePage<T>(check: () => Promise<T>, login: string, next?: string): Promise<T> {
  try { return await check(); }
  catch (error) {
    if (error instanceof AuthError) {
      if (error.status === 401) redirect(`${login}${next ? `?next=${encodeURIComponent(next)}` : ''}`);
      if (error.code === 'ASSIGNMENT_REQUIRED') redirect('/access-denied?reason=assignment');
      if (error.status === 403) forbidden();
      if (error.status === 503) redirect('/access-denied?reason=configuration');
    }
    throw error;
  }
}
