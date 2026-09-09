import AdminShell from '@/components/AdminShell';
import { requireAdmin,requirePage } from '@/lib/auth';
export default async function AdminLayout({children}:{children:React.ReactNode}) { await requirePage(requireAdmin, '/admin/login', '/admin'); return <AdminShell>{children}</AdminShell>; }
