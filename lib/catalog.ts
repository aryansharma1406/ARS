import 'server-only';
import { AuthError } from './auth-errors';
import { getEvents, getVenues } from './store';
import type { Event, Venue } from './types';

export type CatalogIssue = 'setup' | 'unavailable' | null;
const PUBLIC_CATALOG_TIMEOUT_MS = 10000;

// Public browsing may display an outage state. Protected data access still throws.
export async function getPublicCatalog(): Promise<{events:Event[];venues:Venue[];issue:CatalogIssue}> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Allow normal remote database latency, while bounding genuine outages.
    const result = await Promise.race([
      Promise.all([getEvents(), getVenues()]),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AuthError(503, 'Catalog request timed out.', 'DATABASE_UNAVAILABLE')), PUBLIC_CATALOG_TIMEOUT_MS);
      }),
    ]);
    const [events, venues] = result;
    return {events, venues, issue:null};
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 503) throw error;
    const issue = ['DATABASE_SETUP_REQUIRED','AUTH_UNAVAILABLE'].includes(error.code) ? 'setup' : 'unavailable';
    console.error('[ARS catalog]', {code:error.code});
    return {events:[], venues:[], issue};
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
