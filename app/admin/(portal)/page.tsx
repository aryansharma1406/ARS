import {getAdminPerformanceData} from '@/lib/admin-performance';
import {getSettlementReports} from '@/lib/store';
import AdminOverview from '@/components/admin/AdminOverview';

export default async function AdminOverviewPage({searchParams}:{searchParams:Promise<{range?:string;from?:string;to?:string}>}) {
  const initialFilters=await searchParams;
  // All data is fetched behind the existing admin authorization and RLS checks.
  const data=await getAdminPerformanceData();
  const reports=await getSettlementReports();
  const asOf=Date.now();
  return <AdminOverview key={asOf} data={data} initialFilters={initialFilters} asOf={asOf} settlements={reports.map(row=>({created_at:row.created_at,commission_amount:Number(row.commission_amount),status:row.status}))}/>;
}
