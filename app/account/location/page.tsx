import {requirePage,requireRole} from '@/lib/auth';
import {customerDestination} from '@/lib/customer-auth';
import SignInLocation from '@/components/auth/SignInLocation';
export const dynamic='force-dynamic';
export default async function LocationPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 await requirePage(()=>requireRole('customer'),'/login','/account/location');
 const params=await searchParams;
 const destination=new URL(customerDestination(params.next),'https://ars.invalid');
 if(destination.pathname==='/account/location')destination.pathname='/account/tickets';
 if(destination.pathname==='/account/onboarding')destination.searchParams.set('location','handled');
 return <SignInLocation next={destination.pathname+destination.search}/>;
}
