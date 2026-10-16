import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {asRole,createDatabase,ids,seed} from './database-setup';

let db:PGlite;
const session=randomUUID();
beforeAll(async()=>{
 db=await createDatabase(undefined,true);await seed(db);
 await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[session,ids.admin]);
 await asRole(db,null,()=>db.query("SELECT public.register_portal_session($1,$2,'admin','audit')",[ids.admin,session]),'service_role');
 await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({session_id:session})]);
});
afterAll(async()=>{await db?.close();});

async function reserve(customer=ids.customer,quantity=1){
 const tier=(await db.query<{id:string}>('SELECT id FROM public.event_pass_tiers WHERE event_id=$1 AND is_default',[ids.event])).rows[0].id;
 const result=await asRole(db,null,()=>db.query<{id:string}>("SELECT public.reserve_manual_upi($1,$2,$3,$4,'Audit Guest','1234567890',NULL,NULL,$5,NULL,$6) AS id",[customer,ids.event,tier,quantity,quantity*1030,randomUUID()]),'service_role');
 return result.rows[0].id;
}
const submit=(order:string,utr:string,customer=ids.customer)=>asRole(db,customer,()=>db.query('SELECT public.submit_manual_upi($1,$2)',[order,utr]));
const review=(order:string,approve:boolean,actor=ids.admin)=>asRole(db,actor,()=>db.query("SELECT public.review_manual_upi($1,$2,'Audit verification')",[order,approve]));
const tickets=async(order:string)=>(await db.query('SELECT id FROM public.tickets WHERE order_id=$1',[order])).rows;

it('denies inactive owners draft-tier data and returns a definite false',async()=>{
 await db.query('UPDATE public.events SET published=false WHERE id=$1',[ids.eventB]);
 // The inactive owner already has an active assignment to Venue A.
 await db.query('UPDATE public.events SET published=false WHERE id=$1',[ids.eventOther]);
 const result=await asRole(db,ids.inactive,()=>db.query<{owner:boolean;tiers:unknown[]}>('SELECT public.is_venue_owner($1) AS owner,public.event_tier_availability($2) AS tiers',[ids.venue,ids.eventOther]));
 expect(result.rows[0]).toEqual({owner:false,tiers:[]});
 expect((await asRole(db,null,()=>db.query<{tiers:unknown[]}>('SELECT public.event_tier_availability($1) AS tiers',[ids.eventOther]),'anon')).rows[0].tiers).toEqual([]);
 expect((await asRole(db,ids.admin,()=>db.query<{tiers:unknown[]}>('SELECT public.event_tier_availability($1) AS tiers',[ids.eventOther]))).rows[0].tiers).toHaveLength(1);
});
it('rejects group confirmation receipts replayed through the ordinary mobile scan RPC',async()=>{
 const request=randomUUID();
 await db.query("INSERT INTO public.staff_scan_requests(staff_id,request_id,assignment_id,venue_id,token_hash,response,requested_quantity) VALUES($1,$2,$3,$4,encode(sha256(convert_to('audit-group','UTF8')),'hex'),'{\"result\":\"VALID\",\"admitted_quantity\":3}',3)",[ids.staff,request,ids.assignment,ids.venue]);
 await expect(asRole(db,ids.staff,()=>db.query("SELECT public.mobile_scan_ticket('audit-group',$1,$2)",[ids.assignment,request]))).rejects.toMatchObject({code:'22023'});
});
it('keeps matching ordinary scan retries idempotent and rejects preview IDs for group admission',async()=>{
 const request=randomUUID();
 const scan=()=>asRole(db,ids.staff,()=>db.query<{result:{replayed:boolean;result:string}}>("SELECT public.mobile_scan_ticket('audit-unknown',$1,$2) AS result",[ids.assignment,request]));
 expect((await scan()).rows[0].result).toMatchObject({result:'INVALID',replayed:false});
 expect((await scan()).rows[0].result).toMatchObject({result:'INVALID',replayed:true});
 await expect(asRole(db,ids.staff,()=>db.query("SELECT public.check_in_group('audit-unknown',$1,$2,1)",[ids.assignment,request]))).rejects.toMatchObject({code:'22023'});
});
it('keeps UPI pending without passes, prevents duplicate UTRs and issues once after approval',async()=>{
 const order=await reserve(ids.customer,2);const other=await reserve(ids.customerB);
 await submit(order,'auditutr001');expect(await tickets(order)).toHaveLength(0);
 await submit(order,' AUDITUTR001 ');
 await expect(submit(other,'AUDITUTR001',ids.customerB)).rejects.toMatchObject({code:'23505'});
 await expect(submit(order,'ANOTHERUTR',ids.customerB)).rejects.toMatchObject({code:'42501'});
 for(const actor of [ids.customer,ids.owner,ids.staff,ids.inactive])await expect(review(order,true,actor)).rejects.toMatchObject({code:'42501'});
 await review(order,true);await review(order,true);
 expect(await tickets(order)).toHaveLength(2);
 expect((await db.query('SELECT id FROM public.group_passes WHERE order_id=$1',[order])).rows).toHaveLength(1);
 expect((await db.query("SELECT id FROM public.manual_upi_audit WHERE order_id=$1 AND action='verified'",[order])).rows).toHaveLength(1);
 expect((await db.query<{state:string;payment_status:string}>('SELECT p.state,o.payment_status FROM public.manual_upi_payments p JOIN public.orders o ON o.id=p.order_id WHERE o.id=$1',[order])).rows[0]).toEqual({state:'VERIFIED',payment_status:'PAID'});
 await db.query("UPDATE public.orders SET reservation_expires_at=now()-interval '1 second' WHERE id=$1",[other]);
});
it('rejection and expiry issue no tickets and cannot be approved later',async()=>{
 const rejected=await reserve();await submit(rejected,'AUDITREJECT001');await review(rejected,false);
 await expect(review(rejected,true)).rejects.toMatchObject({code:'22023'});
 expect(await tickets(rejected)).toHaveLength(0);
 expect((await db.query<{status:string}>('SELECT payment_status AS status FROM public.orders WHERE id=$1',[rejected])).rows[0].status).toBe('FAILED');
 const expired=await reserve();await submit(expired,'AUDITEXPIRE001');
 await db.query("UPDATE public.orders SET reservation_expires_at=now()-interval '1 second' WHERE id=$1",[expired]);
 await expect(review(expired,true)).rejects.toMatchObject({code:'22023'});
 expect(await tickets(expired)).toHaveLength(0);
});
it('rejects direct non-admin mobile/report/settings access and privileged fulfillment',async()=>{
 for(const actor of [ids.customer,ids.owner,ids.staff,ids.inactive]){
  for(const sql of ["SELECT public.mobile_admin_start()","SELECT public.mobile_admin_dashboard()","SELECT public.admin_upi_search('{}')","SELECT public.admin_upi_details('00000000-0000-4000-8000-000000000000')","SELECT public.set_manual_upi_hold(5)"]){
   await expect(asRole(db,actor,()=>db.query(sql))).rejects.toMatchObject({code:'42501'});
  }
 }
 await expect(asRole(db,ids.admin,()=>db.query("SELECT public.finalize_payment($1,'fake','fake',1)",[ids.customer]))).rejects.toMatchObject({code:'42501'});
 await expect(asRole(db,ids.customer,()=>db.query("UPDATE public.manual_upi_payments SET state='VERIFIED'"))).rejects.toMatchObject({code:'42501'});
});
