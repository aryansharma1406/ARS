import {getAdminPerformanceData} from '@/lib/admin-performance';
import CompareVenues from '@/components/admin/CompareVenues';
export default async function Compare({searchParams}:{searchParams:Promise<{days?:string;range?:string;from?:string;to?:string;venue?:string|string[]}>}) {
  const data=await getAdminPerformanceData();const q=await searchParams;
  return <CompareVenues data={data} initial={q} asOf={Date.now()}/>;
}
