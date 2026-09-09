import LoginForm from '@/components/auth/LoginForm';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginForm next={(await searchParams).next}/>;
}
