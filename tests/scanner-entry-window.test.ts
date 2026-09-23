import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {createDatabase,seed,asRole,ids} from './database-setup';

let db:PGlite;
let definition:string;
let ticket:string;
let order:string;
type Result={result:string;message:string;replayed?:boolean;ticket?:{status:string;scanned_at:string|null}};
beforeAll(async()=>{
 db=await createDatabase(undefined,true);await seed(db);
 order=(await db.query<{id:string}>("INSERT INTO public.orders(customer_id,customer_name,customer_email,customer_phone,event_id,subtotal,fees,total,payment_status) VALUES($1,'TEST Guest','guest@test.invalid','1234567890',$2,1000,30,1030,'PAID') RETURNING id",[ids.customer,ids.event])).rows[0].id;
 ticket=(await db.query<{id:string}>("INSERT INTO public.tickets(order_id,event_id,customer_id,customer_name,customer_email,customer_phone,qr_token) VALUES($1,$2,$3,'TEST Guest','guest@test.invalid','1234567890','TEST-entry-window') RETURNING id",[order,ids.event,ids.customer])).rows[0].id;
 definition=(await db.query<{definition:string}>("SELECT pg_get_functiondef('public.scan_individual_ticket(text,uuid)'::regprocedure) AS definition")).rows[0].definition;
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 await db.exec('BEGIN');
 // Isolated PostgreSQL clock substitution only, rolled back after each test.
 // The deployed function has no clock argument or configurable clock override.
 await db.exec(definition.replace('clock_timestamp()',"current_setting('test.scan_time')::timestamptz"));
 await time('2026-09-30T22:00:00+05:30');
 await db.query("UPDATE public.events SET date='2026-09-30',start_time='21:00',end_time='01:00' WHERE id=$1",[ids.event]);
});
afterEach(async()=>{await db.exec('ROLLBACK');});
async function time(value:string){await db.query("SELECT set_config('test.scan_time',$1,true)",[value]);}
async function scan(mobile:boolean,request='70000000-0000-4000-8000-000000000001'){
 const query=mobile?'SELECT public.mobile_scan_ticket($1,$2,$3) AS result':'SELECT public.scan_ticket($1,$2) AS result';
 return (await asRole(db,ids.staff,async()=>{await db.exec('SAVEPOINT scan_attempt');try{return await db.query<{result:Result}>(query,mobile?[ticket,ids.assignment,request]:[ticket,ids.assignment]);}catch(error){await db.exec('ROLLBACK TO SAVEPOINT scan_attempt');throw error;}finally{await db.exec('RELEASE SAVEPOINT scan_attempt');}})).rows[0].result;
}
for(const mobile of [false,true])describe(mobile?'mobile RPC entry window':'web RPC entry window',()=>{
 it.each([
  ['future event','2026-09-29T22:00:00+05:30','INVALID','EVENT NOT STARTED'],
  ['before opening','2026-09-30T20:59:59+05:30','INVALID','EVENT NOT STARTED'],
  ['exact opening','2026-09-30T21:00:00+05:30','VALID','ENTRY GRANTED'],
  ['today during entry','2026-09-30T22:00:00+05:30','VALID','ENTRY GRANTED'],
  ['overnight during entry','2026-10-01T00:30:00+05:30','VALID','ENTRY GRANTED'],
  ['exact closing','2026-10-01T01:00:00+05:30','INVALID','EVENT ENDED'],
  ['overnight after closing','2026-10-01T02:00:00+05:30','INVALID','EVENT ENDED'],
  ['past event','2026-10-02T22:00:00+05:30','INVALID','EVENT ENDED'],
 ])('%s',async(_name,clock,result,message)=>{
  await time(clock);const response=await scan(mobile);
  expect(response).toMatchObject({result,message:expect.stringContaining(message)});
  const saved=(await db.query<{status:string;scanned_at:string|null}>('SELECT status,scanned_at FROM public.tickets WHERE id=$1',[ticket])).rows[0];
  expect(saved.status).toBe(result==='VALID'?'USED':'VALID');
  if(result==='INVALID')expect(saved.scanned_at).toBeNull();
  expect((await db.query('SELECT result FROM public.scans WHERE ticket_id=$1',[ticket])).rows).toEqual([{result}]);
 });
 it('rejects duplicates even after the event closes',async()=>{
  expect((await scan(mobile)).result).toBe('VALID');
  await time('2026-10-01T02:00:00+05:30');
  expect((await scan(mobile,'70000000-0000-4000-8000-000000000002')).result).toBe('ALREADY_USED');
 });
 it.each(['venue','gate','event'])('preserves wrong %s rejection',async(scope)=>{
  if(scope==='venue')await db.query('UPDATE public.events SET venue_id=$1 WHERE id=$2',[ids.venueB,ids.event]);
  if(scope==='gate')await db.query("UPDATE public.tickets SET gate_name='VIP' WHERE id=$1",[ticket]);
  if(scope==='event')await db.query('UPDATE public.venue_staff_assignments SET event_id=$1 WHERE id=$2',[ids.eventOther,ids.assignment]);
  if(mobile)expect(await scan(true)).toMatchObject({result:'INVALID',message:expect.stringContaining('assigned venue, event or gate')});
  else await expect(scan(false)).rejects.toMatchObject({code:'42501'});
 });
 it.each(['PENDING','REFUNDED','FAILED'])('does not admit %s orders during the window',async(status)=>{
  await db.query('UPDATE public.orders SET payment_status=$1 WHERE id=$2',[status,order]);
  expect((await scan(mobile)).result).toBe('INVALID');
 });
 it('uses IST regardless of database session timezone',async()=>{
  await db.exec("SET LOCAL TIME ZONE 'America/Los_Angeles'");
  expect((await scan(mobile)).result).toBe('VALID');
 });
});
it('preserves mobile rejection receipts across opening; a new request can admit',async()=>{
 await time('2026-09-30T20:00:00+05:30');expect((await scan(true)).result).toBe('INVALID');
 await time('2026-09-30T22:00:00+05:30');expect(await scan(true)).toMatchObject({result:'INVALID',replayed:true});
 expect((await scan(true,'70000000-0000-4000-8000-000000000002')).result).toBe('VALID');
 expect((await db.query('SELECT * FROM public.scans WHERE ticket_id=$1',[ticket])).rows).toHaveLength(2);
});
it('preserves successful mobile retry receipts without another admission',async()=>{
 expect((await scan(true)).result).toBe('VALID');
 await time('2026-10-01T02:00:00+05:30');
 expect(await scan(true)).toMatchObject({result:'VALID',replayed:true});
 expect((await db.query('SELECT * FROM public.scans WHERE ticket_id=$1',[ticket])).rows).toHaveLength(1);
});
it('the production function uses the real database clock, not the test/client clock',async()=>{
 await db.exec(definition);
 await db.query("UPDATE public.events SET date=(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date+10 WHERE id=$1",[ids.event]);
 expect(await scan(false)).toMatchObject({result:'INVALID',message:expect.stringContaining('EVENT NOT STARTED')});
});
