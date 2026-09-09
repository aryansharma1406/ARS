import LoginForm from '@/components/auth/LoginForm';
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginForm portal="admin" next={(await searchParams).next}/>;
}
