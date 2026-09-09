import LoginForm from '@/components/auth/LoginForm';
export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginForm portal="staff" next={(await searchParams).next}/>;
}
