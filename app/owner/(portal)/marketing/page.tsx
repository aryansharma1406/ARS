import { getOwnerVenueData } from '@/lib/owner-data';
import { PageHeader } from '@/components/owner/OwnerUI';
import MarketingIntelligence from '@/components/owner/MarketingIntelligence';
export default async function Marketing({searchParams}:{searchParams:Promise<{venue?:string}>}) {
  const q=await searchParams;const data=await getOwnerVenueData(q.venue);
  return <><PageHeader eyebrow="Audience intelligence" title="Marketing" description="First-party acquisition and purchase reporting. Uncollected data is never estimated."/><MarketingIntelligence venueId={data.venue.id}/></>;
}
