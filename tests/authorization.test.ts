import { beforeEach,describe,it,expect,vi } from 'vitest';
import { NextRequest } from 'next/server';
const state=vi.hoisted(()=>({userId:'owner',role:'venue_owner',active:true,identityError:false,assigned:true,sessionValid:true,rpc:vi.fn(),getUser:vi.fn(),service:vi.fn(),signOut:vi.fn(),signIn:vi.fn()}));
const client=vi.hoisted(()=>({
 auth:{getUser:state.getUser,signOut:state.signOut,signInWithPassword:state.signIn},
 from:vi.fn((table:string)=>{
  const filters:Record<string,unknown>={};
  const rows=()=>{
   if(table==='users') return [{id:state.userId,name:'Account',email:'user@test.invalid',role:state.role,active:state.active}];
   if(table==='venue_owners') return state.assigned?[{user_id:state.userId,venue_id:'venue-a',active:true,venues:{active:true}}]:[];
   if(table==='venue_staff_assignments') return state.assigned?[{id:'assignment-a',user_id:state.userId,venue_id:'venue-a',event_id:'event-a',gate_name:'Main',active:true,venues:{name:'Venue A',active:true}}]:[];
   if(table==='orders') return filters.razorpay_order_id==='order_owned'&&filters.customer_id===state.userId?[{id:'order-a',razorpay_order_id:'order_owned',total:1030}]:[];
   if(table==='tickets') return filters.id==='ticket-owned'&&filters.customer_id===state.userId?[{id:'ticket-owned',customer_id:state.userId,event_id:'event-a'}]:[];
   return [];
  };
  const query={select:vi.fn(()=>query),eq:vi.fn((key:string,value:unknown)=>{filters[key]=value;return query;}),in:vi.fn(()=>query),order:vi.fn(()=>query),maybeSingle:async()=>({data:rows()[0]||null,error:null}),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(resolve({data:rows(),error:null}))};
  return query;
 }),rpc:state.rpc,
}));
vi.mock('@/lib/supabase',()=>({getSupabaseClient:async()=>client,getServiceRoleSupabaseClient:state.service}));
vi.mock('@supabase/ssr',()=>({createServerClient:()=>client}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);},forbidden:()=>{throw new Error('forbidden:403');}}));
vi.mock('@/lib/razorpay',()=>({createRazorpayOrder:vi.fn(async()=>({id:'order_bound',amount:103000,currency:'INR'})),verifyRazorpayPaymentSignature:vi.fn(()=>true),verifyCapturedPayment:vi.fn(async()=>103000)}));
import { requireAuth,requireOwner,requireAdmin,requireStaff,requirePage } from '@/lib/auth';
import { getOrders,getTickets,getSources,getScans,getSettlementReports,getAdminAnalytics,getTicketById,updateVenue,addVenue,addSource,setUserAccess,assignVenueOwner } from '@/lib/store';
import { middleware } from '@/middleware';
import { GET as ownerEventsGET,PATCH as ownerEventPATCH } from '@/app/api/owner/events/route';
import { PATCH as staffPATCH } from '@/app/api/owner/staff/route';
import { PATCH as settingsPATCH } from '@/app/api/owner/settings/route';
import { POST as scanPOST } from '@/app/api/staff/scan/route';
import { POST as createPOST } from '@/app/api/checkout/create-order/route';
import { POST as verifyPOST } from '@/app/api/checkout/verify/route';
import { safeNext } from '@/lib/api';
import { login,logout } from '@/lib/auth-handlers';
const request=(path:string,body:Record<string,unknown>,method='POST',origin='https://ars.test')=>new Request(`https://ars.test${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.clearAllMocks();Object.assign(state,{userId:'owner',role:'venue_owner',active:true,identityError:false,assigned:true,sessionValid:true});
 state.getUser.mockImplementation(async()=>({data:{user:state.identityError?null:{id:state.userId,email:'user@test.invalid'}},error:state.identityError?new Error('Invalid token'):null}));
 state.rpc.mockImplementation(async(name:string,args:Record<string,unknown>)=>{
  if((name==='save_event'||name==='save_staff_assignment')&&args.target_id==='foreign-resource')return {data:null,error:{code:'42501'}};
  if(name==='scan_ticket')return {data:{result:'VALID',message:'Entry granted'},error:null};
  if(name==='portal_session_valid')return {data:state.sessionValid,error:null};
  if(name==='reserve_tier_order')return {data:{id:'pending-order',total:1030},error:null};
  if(name==='finalize_payment')return {data:{tickets:[{id:'ticket-owned'}]},error:null};
  return {data:[],error:null};
 });
 state.signIn.mockResolvedValue({data:{user:{id:state.userId,email:'user@test.invalid'},session:{access_token:'test.'+Buffer.from(JSON.stringify({session_id:'60000000-0000-4000-8000-000000000001'})).toString('base64url')+'.test'}},error:null});state.signOut.mockResolvedValue({error:null});
 state.service.mockReturnValue(client);process.env.NEXT_PUBLIC_APP_URL='https://ars.test';process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.test';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-anon';
});
describe('server authentication and route guards',()=>{
 it('does not repeat identity checks in middleware',async()=>{
  const response=await middleware(new NextRequest('https://ars.test/account/tickets'));
  expect(response.status).toBe(200);expect(state.getUser).not.toHaveBeenCalled();
 });
 it('rejects forged/unverified identities even with an apparent local role',async()=>{
  state.identityError=true;await expect(requireAuth()).rejects.toMatchObject({status:401});expect(state.getUser).toHaveBeenCalled();
 });
 it('rejects inactive accounts and unassigned owner/staff accounts',async()=>{
  state.active=false;await expect(requireOwner()).rejects.toMatchObject({status:403});
  state.active=true;state.assigned=false;await expect(requireOwner()).rejects.toMatchObject({status:403,code:'ASSIGNMENT_REQUIRED'});
  state.role='staff';await expect(requireStaff()).rejects.toMatchObject({status:403,code:'ASSIGNMENT_REQUIRED'});
 });
 it('rechecks server page access if middleware is bypassed',async()=>{
  state.role='customer';await expect(requirePage(requireOwner,'/owner/login')).rejects.toThrow('forbidden:403');
  await expect(requirePage(requireAdmin,'/admin/login')).rejects.toThrow('forbidden:403');
  state.identityError=true;await expect(requirePage(requireOwner,'/owner/login')).rejects.toThrow('redirect:/owner/login');
 });
 it('rejects a replaced business session without bypassing its guard',async()=>{state.sessionValid=false;await expect(requireOwner()).rejects.toMatchObject({status:401,code:'SESSION_REPLACED'});});
 it('protects login next against external redirects',()=>{
  for(const value of ['https://evil.test','//evil.test','/\\evil.test','/\nevil.test'])expect(safeNext(value,'/owner')).toBe('/owner');
 });
 it('does not make identity calls for public pages',async()=>{
  const response=await middleware(new NextRequest('https://ars.test/events'));
  expect(response.status).toBe(200);expect(state.getUser).not.toHaveBeenCalled();
 });
});
describe('direct API and server action authorization',()=>{
 it('rejects unauthenticated API calls without accessing privileged storage',async()=>{
  state.identityError=true;
  for(const handler of [ownerEventPATCH,staffPATCH,settingsPATCH,scanPOST,createPOST,verifyPOST])expect((await handler(request('/api/test',{}))).status).toBe(401);
  expect(state.service).not.toHaveBeenCalled();expect(state.rpc.mock.calls.filter(([name])=>name!=='portal_session_valid')).toHaveLength(0);
 });
 it('explicitly rejects foreign venue IDs instead of returning an empty list',async()=>{
  expect((await ownerEventsGET(new Request('https://ars.test/api/owner/events?venueId=venue-b'))).status).toBe(403);
 });
 it.each([getOrders,getTickets,getSources,getScans,getSettlementReports])('owner server data access rejects an unassigned venue',async fn=>{
  await expect(fn('venue-b')).rejects.toMatchObject({status:403});
 });
 it('rejects mismatched event and staff IDs before returning success',async()=>{
  expect((await ownerEventPATCH(request('/api/owner/events',{id:'foreign-resource',venue_id:'venue-a',published:false},'PATCH'))).status).toBe(403);
  expect(state.rpc).toHaveBeenCalledWith('save_event',{payload:{published:false},target_id:'foreign-resource',target_venue:'venue-a'});
  expect((await staffPATCH(request('/api/owner/staff',{id:'foreign-resource',venue_id:'venue-a',active:false},'PATCH'))).status).toBe(403);
 });
 it('rejects commission or settlement fields in owner settings',async()=>{
  for(const extra of [{commission_percentage:0},{venue_amount:999999},{source_code:'FORGED'}])expect((await settingsPATCH(request('/api/owner/settings',{venue_id:'venue-a',...extra},'PATCH'))).status).toBe(400);
  expect(state.rpc.mock.calls.filter(([name])=>name!=='portal_session_valid')).toHaveLength(0);
 });
 it('staff cannot call business/admin server actions directly',async()=>{
  state.role='staff';
  for(const fn of [getOrders,getTickets,getSources,getSettlementReports,getAdminAnalytics])await expect(fn()).rejects.toMatchObject({status:403});
  await expect(updateVenue('venue-a',{commission_percentage:0})).rejects.toMatchObject({status:403});
  await expect(addVenue({} as never)).rejects.toMatchObject({status:403});
  await expect(addSource({} as never)).rejects.toMatchObject({status:403});
  await expect(setUserAccess('staff','admin',true)).rejects.toMatchObject({status:403});
  await expect(assignVenueOwner('staff','venue-a',true)).rejects.toMatchObject({status:403});
 });
 it('customer can request own ticket but is explicitly denied another customer ticket',async()=>{
  state.role='customer';state.userId='customer';
  await expect(getTicketById('ticket-owned')).resolves.toMatchObject({id:'ticket-owned'});
  await expect(getTicketById('ticket-other')).rejects.toMatchObject({status:403});
 });
 it('rejects forged scanner identities and assignments, accepts valid scope and reports duplicates as 409',async()=>{
  state.role='staff';
  expect((await scanPOST(request('/api/staff/scan',{qrToken:'token',staffId:'other',assignmentId:'assignment-a'}))).status).toBe(400);
  expect((await scanPOST(request('/api/staff/scan',{qrToken:'token',assignmentId:'assignment-b'}))).status).toBe(403);
  expect((await scanPOST(request('/api/staff/scan',{qrToken:'token',assignmentId:'assignment-a'}))).status).toBe(200);
  state.rpc.mockResolvedValue({data:{result:'ALREADY_USED',message:'Denied'},error:null});
  expect((await scanPOST(request('/api/staff/scan',{qrToken:'token',assignmentId:'assignment-a'}))).status).toBe(409);
 });
 it('rejects cross-origin mutations',async()=>{
  expect((await settingsPATCH(request('/api/owner/settings',{venue_id:'venue-a'},'PATCH','https://evil.test'))).status).toBe(403);expect(state.rpc.mock.calls.filter(([name])=>name!=='portal_session_valid')).toHaveLength(0);
 });
 it('checkout rejects price and customer-ID overrides, binds authenticated identity',async()=>{
  state.role='customer';state.userId='customer';
  expect((await createPOST(request('/api/checkout/create-order',{amount:1,customer_id:'victim'}))).status).toBe(400);expect(state.service).not.toHaveBeenCalled();
  expect((await createPOST(request('/api/checkout/create-order',{eventId:'event-a',tierId:'50000000-0000-4000-8000-000000000001',expectedTotal:1030,quantity:1,customer_name:'Guest',customer_phone:'1234567890',sourceCode:'SOURCE-A'}))).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith('reserve_tier_order',expect.objectContaining({target_customer:'customer',target_event:'event-a',ticket_quantity:1}));
  expect(state.rpc).toHaveBeenCalledWith('bind_payment_order',expect.objectContaining({target_customer:'customer',target_order:'pending-order',provider_order:'order_bound'}));
 });
 it('verification rejects foreign orders and late changes to identity/event/quantity/attribution',async()=>{
  state.role='customer';state.userId='customer';
  const receipt={razorpay_order_id:'order_foreign',razorpay_payment_id:'pay_valid',razorpay_signature:'test'};
  expect((await verifyPOST(request('/api/checkout/verify',receipt))).status).toBe(403);
  expect((await verifyPOST(request('/api/checkout/verify',{...receipt,event_id:'other',quantity:10,source_code:'FORGED'}))).status).toBe(400);expect(state.rpc.mock.calls.filter(([name])=>name!=='portal_session_valid')).toHaveLength(0);
  expect((await verifyPOST(request('/api/checkout/verify',{...receipt,razorpay_order_id:'order_owned'}))).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith('finalize_payment',expect.objectContaining({target_customer:'customer',provider_order:'order_owned',captured_amount:103000}));
 });
});


describe('separate portal sign-in and sign-out',()=>{
 it('admin login rejects a customer even when the browser claims an admin role',async()=>{
  state.role='customer';
  const response=await login(request('/api/admin/login',{email:'user@test.invalid',password:'password',role:'admin'}),'admin');
  expect(response.status).toBe(403);expect(state.signOut).toHaveBeenCalledWith({scope:'local'});
 });
 it('owner login uses Supabase password verification and rejects default demo credentials on failure',async()=>{
  state.signIn.mockResolvedValue({error:{message:'Invalid credentials'}});
  expect((await login(request('/api/owner/login',{email:'owner@ars.events',password:'ARSowner2026'}),'owner')).status).toBe(401);
 });
 it('successful privileged login uses its own portal destination',async()=>{
  state.role='admin';
  const response=await login(request('/api/admin/login',{email:'admin@test.invalid',password:'password'}),'admin');
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({next:'/admin'});
 });
 it('sign-out revokes the Supabase session, expires the legacy cookie, and keeps admin routing separate',async()=>{
  const response=await logout(request('/api/admin/logout',{}),'/admin/login');
  expect(response.status).toBe(303);expect(response.headers.get('location')).toBe('https://ars.test/admin/login');
  expect(state.signOut).toHaveBeenCalledWith({scope:'local'});
  expect(response.cookies.get('ars_owner_session')?.value).toBe('');
 });
});
