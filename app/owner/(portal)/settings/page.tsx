import { PageHeader,Panel } from '@/components/owner/OwnerUI';
import SettingsForm from '@/components/owner/SettingsForm';
import { getOwnerVenueData } from '@/lib/owner-data';
import { getOwnerNotificationPreferences } from '@/lib/store';

export default async function OwnerSettings({searchParams}:{searchParams:Promise<{venue?:string}>}){
  const query=await searchParams;
  const data=await getOwnerVenueData(query.venue);
  const preferences=await getOwnerNotificationPreferences(data.owner.userId);

  return <>
    <PageHeader
      eyebrow="Owner account"
      title="Settings"
      description="Manage the selected venue profile and operational notifications."
    />
    <Panel title="Venue contact & details">
      <p className="mb-4 text-sm text-zinc-400">Owner contact phone: {data.venue.owner_phone || 'Not set. Ask your ARS admin to update this venue contact.'}</p>
      <SettingsForm key={data.venue.id} venue={data.venue} profile={{name:data.venue.owner_name ?? '',email:data.venue.owner_email ?? data.owner.email}} preferences={preferences}/>
    </Panel>
  </>;
}
