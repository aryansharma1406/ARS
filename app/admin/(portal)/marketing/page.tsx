import {requireAdmin} from '@/lib/auth';
import MarketingCenter from '@/components/admin/MarketingCenter';
export default async function Page(){await requireAdmin();return <MarketingCenter/>;}
