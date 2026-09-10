import CustomerAuthForm from '@/components/auth/CustomerAuthForm';
import { requirePage, requireRole } from '@/lib/auth';
export default async function ResetPasswordPage() {
  await requirePage(() => requireRole('customer'), '/login');
  return <CustomerAuthForm appUrl={process.env.NEXT_PUBLIC_APP_URL} initialMode="reset"/>;
}
