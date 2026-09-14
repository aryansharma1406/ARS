import LoginActivity from '@/components/LoginActivity';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string;venue?:string}>}){
  const query=await searchParams;
  return <LoginActivity portal="owner" page={query.page} venue={query.venue}/>;
}
