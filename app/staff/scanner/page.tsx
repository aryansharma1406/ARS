import StaffScanner from '@/components/StaffScanner';
import { requirePage,requireStaff } from '@/lib/auth';
export default async function ScannerPage() { const staff=await requirePage(requireStaff,'/staff/login','/staff/scanner'); return <StaffScanner assignments={staff.assignments}/>; }
