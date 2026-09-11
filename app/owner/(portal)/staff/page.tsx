import StaffActivity from '@/components/owner/StaffActivity';
import { PageHeader,Panel } from '@/components/owner/OwnerUI';
import StaffManager from '@/components/owner/StaffManager';
import { getOwnerVenueData } from '@/lib/owner-data';
import { getVenueStaffAssignments } from '@/lib/store';

export default async function OwnerStaff({ searchParams }: { searchParams: Promise<{ venue?: string }> }) {
  const query=await searchParams;
  const data=await getOwnerVenueData(query.venue);
  const assignments=await getVenueStaffAssignments(data.venue.id);

  return <>
    <PageHeader
      eyebrow="Door operations"
      title="Staff"
      description="Invite your team and manage scanner access by venue, event and entry gate."
    />
    <Panel title="Staff access and invitations">
      <StaffManager key={data.venue.id} venueId={data.venue.id} events={data.events} assignments={assignments} />
    </Panel>
    <StaffActivity venueId={data.venue.id}/>
  </>;
}
