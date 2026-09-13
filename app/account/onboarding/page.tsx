import { requirePage,requireRole } from '@/lib/auth';
import { customerDestination } from '@/lib/customer-auth';
import { discoveryVenues } from '@/lib/customer-onboarding';
import CustomerOnboarding from '@/components/auth/CustomerOnboarding';
export const dynamic='force-dynamic';
export default async function Onboarding({searchParams}:{searchParams:Promise<{next?:string;location?:string}>}){
 const customer=await requirePage(()=>requireRole('customer'),'/login','/account/onboarding');
 const params=await searchParams;const destination=customerDestination(params.next);
 const next=destination.startsWith('/account/onboarding')?'/account/tickets':destination;
 const {venues}=await discoveryVenues();
 return <CustomerOnboarding name={customer.name} email={customer.email} next={next} venues={venues} skipLocation={params.location==='handled'}/>;
}
