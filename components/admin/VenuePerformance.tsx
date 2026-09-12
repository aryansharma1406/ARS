import { getAdminPerformanceData } from '@/lib/admin-performance';
import VenuePerformanceTable from './VenuePerformanceTable';
export default async function VenuePerformance({days=30,range,from,to}:{days?:number;range?:string;from?:string;to?:string}) {
  const data=await getAdminPerformanceData();
  return <VenuePerformanceTable data={data} initial={{days:String(days),range,from,to}} asOf={Date.now()}/>;
}
