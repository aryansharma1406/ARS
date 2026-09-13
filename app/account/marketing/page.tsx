import {requirePage,requireRole} from '@/lib/auth';
import MarketingPreferences from '@/components/MarketingPreferences';
export default async function Page(){await requirePage(()=>requireRole('customer'),'/login','/account/marketing');return <MarketingPreferences/>;}
