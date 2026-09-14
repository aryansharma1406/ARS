import LoginActivity from '@/components/LoginActivity';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){
  return <LoginActivity portal="admin" page={(await searchParams).page}/>;
}
