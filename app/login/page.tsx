import CustomerAuthForm from '@/components/auth/CustomerAuthForm';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <CustomerAuthForm appUrl={process.env.NEXT_PUBLIC_APP_URL} key={`${next || ''}:${error || ''}`} next={next} errorCode={error}/>;
}
