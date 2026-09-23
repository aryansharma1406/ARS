import {requireAdmin} from '@/lib/auth';
import AdminUpiVerification from '@/components/AdminUpiVerification';
export const dynamic='force-dynamic';
export default async function PaymentsPage(){await requireAdmin();return <AdminUpiVerification/>;}
