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
    <Panel title="Profile & venue">
      <SettingsForm venue={data.venue} profile={{name:data.owner.name,email:data.owner.email}} preferences={preferences}/>
    </Panel>
  </>;
}
