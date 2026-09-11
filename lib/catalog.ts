import 'server-only';
import { AuthError } from './auth-errors';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase';
import { dbError } from './api';
import type { Event, Venue } from './types';

export type CatalogIssue = 'setup' | 'unavailable' | null;
const PUBLIC_CATALOG_TIMEOUT_MS = 10000;

// Public browsing may display an outage state. Protected data access still throws.
export async function getPublicCatalog(): Promise<{events:Event[];venues:Venue[];issue:CatalogIssue}> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Public listings must not inherit an owner, admin or staff session.
    const { url, key } = supabaseConfig();
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    // Allow normal remote database latency, while bounding genuine outages.
    const result = await Promise.race([
      Promise.all([
        client.from('events').select('id,venue_id,name,description,image,category,date,start_time,end_time,ticket_price,ticket_capacity,tickets_sold,age_limit,published,created_at').eq('published', true),
        client.from('venues').select('id,name,location,address,description,image,active,created_at').eq('active', true),
      ]),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AuthError(503, 'Catalog request timed out.', 'DATABASE_UNAVAILABLE')), PUBLIC_CATALOG_TIMEOUT_MS);
      }),
    ]);
    const [eventResult, venueResult] = result;
    dbError(eventResult.error); dbError(venueResult.error);
    const venues = (venueResult.data || []) as Venue[];
    const events = (eventResult.data || []).filter(event => venues.some(venue => venue.id === event.venue_id)).map(event => {
      const venue = venues.find(venue => venue.id === event.venue_id)!;
      return { ...event, venue_name: `${venue.name}, ${venue.address}` };
    }) as Event[];
    return {events, venues, issue:null};
  } catch (error) {
    if (!(error instanceof AuthError) || ![403,503].includes(error.status)) throw error;
    const issue = error.status === 403 || ['DATABASE_SETUP_REQUIRED','AUTH_UNAVAILABLE'].includes(error.code) ? 'setup' : 'unavailable';
    console.error('[ARS catalog]', {code:error.code});
    return {events:[], venues:[], issue};
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
