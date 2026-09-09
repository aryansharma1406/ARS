import 'server-only';
import { AuthError } from './auth-errors';
import { getEvents, getVenues } from './store';
import type { Event, Venue } from './types';

export type CatalogIssue = 'setup' | 'unavailable' | null;
// Public browsing may display an outage state. Protected data access still throws.
export async function getPublicCatalog(): Promise<{events:Event[];venues:Venue[];issue:CatalogIssue}> {
  try {
    const [events, venues] = await Promise.all([getEvents(), getVenues()]);
    return {events, venues, issue:null};
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 503) throw error;
    const issue = ['DATABASE_SETUP_REQUIRED','AUTH_UNAVAILABLE'].includes(error.code) ? 'setup' : 'unavailable';
    console.error('[ARS catalog]', {code:error.code});
    return {events:[], venues:[], issue};
  }
}
