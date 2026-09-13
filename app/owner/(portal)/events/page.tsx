import {Suspense} from 'react';
import OwnerEventsList from '@/components/owner/OwnerEventsList';
import {getOwnerVenueData} from '@/lib/owner-data';

export const dynamic = 'force-dynamic';

export default async function OwnerEvents({searchParams}:{searchParams:Promise<{venue?:string;status?:string}>}) {
  const {venue}=await searchParams;
  const data=await getOwnerVenueData(venue);
  return <Suspense fallback={<p role="status" className="text-sm text-zinc-400">Loading venue events...</p>}>
    <OwnerEventsList key={data.venue.id} venueId={data.venue.id} events={data.events} initialNow={Date.now()}/>
  </Suspense>;
}
