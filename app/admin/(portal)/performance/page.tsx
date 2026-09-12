import { requireAdmin } from '@/lib/auth';
import VenuePerformance from '@/components/admin/VenuePerformance';
import { periodDays } from '@/lib/admin-performance';
export default async function Performance({searchParams}:{searchParams:Promise<{days?:string;range?:string;from?:string;to?:string}>}) {
  await requireAdmin();const q=await searchParams;
  return <VenuePerformance days={periodDays(q.days)} range={q.range} from={q.from} to={q.to}/>;
}
