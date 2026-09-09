import OwnerShell from '@/components/owner/OwnerShell';
import { requireOwner } from '@/lib/owner-auth';
import { getVenues } from '@/lib/store';

export default async function OwnerPortalLayout({children}:{children:React.ReactNode}){const owner=await requireOwner();const venues=(await getVenues()).filter(v=>owner.venueIds.includes(v.id));return <OwnerShell venues={venues} ownerName={owner.name}>{children}</OwnerShell>}
