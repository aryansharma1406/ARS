import PortalSessionGuard from '@/components/PortalSessionGuard';
import OwnerShell from '@/components/owner/OwnerShell';
import { requireOwner } from '@/lib/owner-auth';
import { dbError } from '@/lib/api';
import type { Venue } from '@/lib/types';

export default async function OwnerPortalLayout({children}:{children:React.ReactNode}) {
  const owner = await requireOwner();
  // Contact details are private business data, not part of the public venue catalog.
  const { data, error } = await owner.client.rpc('business_venues');
  dbError(error);
  const venues = ((data || []) as Venue[]).filter(venue => owner.venueIds.includes(venue.id));
  return <PortalSessionGuard portal="owner"><OwnerShell venues={venues} ownerName={owner.name}>{children}</OwnerShell></PortalSessionGuard>;
}
