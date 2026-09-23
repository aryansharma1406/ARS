import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {PGlite} from '@electric-sql/pglite';
import {createDatabase,seed,asRole,ids} from './database-setup';
import {customerPasses,type GroupPassRow} from '../lib/customer-group-passes';
import type {Ticket} from '../lib/types';
let db:PGlite,order:string,token:string,groupId:string,firstTicket:string;
let functions:string[];
type Reply={result:string;message:string;replayed?:boolean;admitted_quantity:number;group:GroupPassRow};
beforeAll(async()=>{
 db=await createDatabase(undefined,true);await seed(db);
 const reserved=await asRole(db,null,()=>db.query<{id:string}>("SELECT id FROM public.reserve_order($1,$2,10,'TEST Group','1234567890',NULL)",[ids.customer,ids.event]),'service_role');
 order=reserved.rows[0].id;
 await asRole(db,null,()=>db.query("SELECT public.bind_payment_order($1,$2,'order_group_test')",[ids.customer,order]),'service_role');
 const fulfilled=await asRole(db,null,()=>db.query<{result:{tickets:Ticket[]}}>("SELECT public.finalize_payment($1,'order_group_test','pay_group_test',1030000) AS result",[ids.customer]),'service_role');
 firstTicket=fulfilled.rows[0].result.tickets[0].id;
 const group=(await db.query<GroupPassRow>('SELECT * FROM public.group_passes WHERE order_id=$1',[order])).rows[0];token=group.qr_token;groupId=group.id;
 functions=(await db.query<{definition:string}>("SELECT pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('group_entry','scan_individual_ticket')")).rows.map(r=>r.definition);
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 await db.exec('BEGIN');
 // Clock control exists only inside this disposable test database/transaction.
 for(const definition of functions)await db.exec(definition.replaceAll('clock_timestamp()',"current_setting('test.scan_time')::timestamptz"));
 await db.query("SELECT set_config('test.scan_time','2026-09-30T22:00:00+05:30',true)");
 await db.query("UPDATE public.events SET date='2026-09-30',start_time='21:00',end_time='01:00' WHERE id=$1",[ids.event]);
});
afterEach(async()=>{await db.exec('ROLLBACK');});
async function role<T>(user:string|null,fn:()=>Promise<T>,roleName='authenticated'){
 return asRole(db,user,async()=>{await db.exec('SAVEPOINT operation');try{return await fn();}catch(error){await db.exec('ROLLBACK TO SAVEPOINT operation');throw error;}finally{await db.exec('RELEASE SAVEPOINT operation');}},roleName);
}
async function enter(quantity:number,request=randomUUID(),staff=ids.staff,assignment=ids.assignment){
 return (await role(staff,()=>db.query<{r:Reply}>('SELECT public.check_in_group($1,$2,$3,$4) AS r',[token,assignment,request,quantity]))).rows[0].r;
}
async function preview(mobile=false){return (await role(ids.staff,()=>db.query<{r:Reply}>(mobile?'SELECT public.mobile_scan_ticket($1,$2,$3) AS r':'SELECT public.scan_ticket($1,$2) AS r',mobile?[token,ids.assignment,randomUUID()]:[token,ids.assignment]))).rows[0].r;}
async function counters(){return (await db.query<GroupPassRow>('SELECT * FROM public.group_passes WHERE id=$1',[groupId])).rows[0];}
it('fulfilment creates one group credential and customer UI exposes one QR',async()=>{
 expect((await db.query('SELECT id FROM public.group_passes WHERE order_id=$1',[order])).rows).toHaveLength(1);
 const tickets=(await db.query<Ticket>('SELECT * FROM public.tickets WHERE order_id=$1',[order])).rows;
 expect(tickets).toHaveLength(10); // Internal attendance ledger is preserved.
 const passes=customerPasses(tickets,[await counters()]);expect(passes).toHaveLength(1);
 expect(passes[0]).toMatchObject({qr_token:token,purchased_quantity:10,checked_in_quantity:0,remaining_quantity:10});
 expect(token).toMatch(/^ars-group-[a-f0-9]{64}$/);
});
it('previews on web and mobile admit nobody',async()=>{
 for(const mobile of [false,true])expect(await preview(mobile)).toMatchObject({result:'GROUP_READY',admitted_quantity:0,group:{remaining_quantity:10}});
 expect((await counters()).checked_in_quantity).toBe(0);
 expect((await db.query('SELECT * FROM public.scans')).rows).toHaveLength(0);
});
it('10 -> 3 -> 4 -> 3 and fully used; audits agree with the ticket ledger',async()=>{
 for(const [quantity,entered,remaining] of [[3,3,7],[4,7,3],[3,10,0]])expect(await enter(quantity)).toMatchObject({result:'VALID',admitted_quantity:quantity,group:{checked_in_quantity:entered,remaining_quantity:remaining}});
 expect(await preview()).toMatchObject({result:'ALREADY_USED',message:'GROUP PASS FULLY USED'});
 expect(await enter(1)).toMatchObject({result:'ALREADY_USED',admitted_quantity:0});
 expect((await db.query<{admitted_quantity:number;remaining_quantity:number}>('SELECT admitted_quantity,remaining_quantity FROM public.group_admissions ORDER BY scanned_at,id')).rows.map(r=>[r.admitted_quantity,r.remaining_quantity])).toEqual([[3,7],[4,3],[3,0],[0,0]]);
 expect((await db.query("SELECT id FROM public.tickets WHERE order_id=$1 AND status='USED'",[order])).rows).toHaveLength(10);
 expect((await db.query("SELECT id FROM public.scans WHERE result='VALID'")).rows).toHaveLength(10);
});
it('idempotent retry returns the original receipt without another admission',async()=>{
 const request=randomUUID();await enter(3,request);expect(await enter(3,request)).toMatchObject({result:'VALID',replayed:true,group:{remaining_quantity:7}});
 await expect(enter(4,request)).rejects.toMatchObject({code:'22023'});
 expect((await counters()).checked_in_quantity).toBe(3);
 expect((await db.query('SELECT * FROM public.group_admissions')).rows).toHaveLength(1);
});
it('two authorized staff stale previews cannot over-admit (sequential contention model)',async()=>{
 await db.query('UPDATE public.venue_staff_assignments SET venue_id=$1,event_id=$2 WHERE id=$3',[ids.venue,ids.event,ids.assignmentB]);
 expect((await preview()).group.remaining_quantity).toBe(10);
 expect((await enter(7)).result).toBe('VALID');
 expect(await enter(7,randomUUID(),ids.staffUnassigned,ids.assignmentB)).toMatchObject({result:'INVALID',admitted_quantity:0,group:{remaining_quantity:3}});
 expect((await enter(3,randomUUID(),ids.staffUnassigned,ids.assignmentB)).result).toBe('VALID');
 expect((await counters()).checked_in_quantity).toBe(10);
});
it.each([0,-1,11,2147483647])('rejects untrusted quantity %s',async quantity=>{
 expect((await enter(quantity)).result).toBe('INVALID');expect((await counters()).checked_in_quantity).toBe(0);
});
it.each([
 ['2026-09-29T22:00:00+05:30','INVALID','EVENT NOT STARTED'],
 ['2026-09-30T21:00:00+05:30','VALID','ENTRY APPROVED'],
 ['2026-10-01T00:30:00+05:30','VALID','ENTRY APPROVED'],
 ['2026-10-01T01:00:00+05:30','INVALID','EVENT ENDED'],
 ['2026-10-02T22:00:00+05:30','INVALID','EVENT ENDED'],
])('enforces entry window at %s',async(time,result,message)=>{
 await db.query("SELECT set_config('test.scan_time',$1,true)",[time]);expect(await enter(3)).toMatchObject({result,message:expect.stringContaining(message)});
 expect((await counters()).checked_in_quantity).toBe(result==='VALID'?3:0);
});
it.each(['venue','gate','event'])('rejects wrong %s',async scope=>{
 if(scope==='venue')await db.query('UPDATE public.events SET venue_id=$1 WHERE id=$2',[ids.venueB,ids.event]);
 if(scope==='gate')await db.query("UPDATE public.tickets SET gate_name='VIP' WHERE order_id=$1",[order]);
 if(scope==='event')await db.query('UPDATE public.venue_staff_assignments SET event_id=$1 WHERE id=$2',[ids.eventOther,ids.assignment]);
 expect((await enter(3)).result).toBe('INVALID');expect((await counters()).checked_in_quantity).toBe(0);
});
it.each(['PENDING','REFUNDED','FAILED'])('rejects %s payment',async status=>{
 await db.query('UPDATE public.orders SET payment_status=$1 WHERE id=$2',[status,order]);expect((await enter(3)).result).toBe('INVALID');expect((await counters()).checked_in_quantity).toBe(0);
});
it('rejects invalid member tickets and old group-member QR admission',async()=>{
 expect((await role(ids.staff,()=>db.query<{r:Reply}>('SELECT public.scan_ticket($1,$2) AS r',[firstTicket,ids.assignment]))).rows[0].r.result).toBe('INVALID');
 await db.query("UPDATE public.tickets SET status='REFUNDED' WHERE id=$1",[firstTicket]);expect((await enter(3)).result).toBe('INVALID');expect((await counters()).checked_in_quantity).toBe(0);
});
it('keeps customer ownership/RLS and internal admission functions private',async()=>{
 expect((await role(ids.customerB,()=>db.query('SELECT * FROM public.group_passes'))).rows).toHaveLength(0);
 expect((await role(ids.customer,()=>db.query('SELECT * FROM public.group_passes'))).rows).toHaveLength(1);
 await expect(role(ids.staff,()=>db.query('SELECT public.scan_individual_ticket($1,$2)',[firstTicket,ids.assignment]))).rejects.toMatchObject({code:'42501'});
 await expect(role(ids.customer,()=>db.query('SELECT public.check_in_group($1,$2,$3,3)',[token,ids.assignment,randomUUID()]))).rejects.toMatchObject({code:'42501'});
 await expect(role(ids.customer,()=>db.query('UPDATE public.group_passes SET checked_in_quantity=0'))).rejects.toMatchObject({code:'42501'});
});
