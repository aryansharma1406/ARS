import CustomerAuthForm from '@/components/auth/CustomerAuthForm';
export default function SignupPage() {
  return <CustomerAuthForm appUrl={process.env.NEXT_PUBLIC_APP_URL} initialMode="signup"/>;
}
