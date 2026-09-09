import { Empty,PageHeader,Panel } from '@/components/owner/OwnerUI';
import StaffManager from '@/components/owner/StaffManager';
import { getOwnerVenueData } from '@/lib/owner-data';
import { getVenueStaffAssignments } from '@/lib/store';

export default async function OwnerStaff({ searchParams }: { searchParams: Promise<{ venue?: string }> }) {
  const query=await searchParams; const data=await getOwnerVenueData(query.venue); const assignments=await getVenueStaffAssignments(data.venue.id);
  return <><PageHeader eyebrow="Door operations" title="Staff" description="Assign existing ARS staff to this venue, an event and an entry gate." /><Panel title={`${assignments.length} assignments`}><StaffManager venueId={data.venue.id} events={data.events} assignments={assignments} />{!assignments.length && <Empty title="No staff assigned" copy="Add an existing staff account to this venue." />}</Panel></>;
}
