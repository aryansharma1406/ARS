import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { PGlite } from '@electric-sql/pglite';
import { createDatabase,seed,asRole,ids } from './database-setup';
let db:PGlite;
let ticketA:string,ticketB:string,orderA:string;
beforeAll(async()=>{
  db=await createDatabase(); await seed(db);
  for (const [customer,event,code,suffix] of [[ids.customer,ids.event,'SOURCE-A','A'],[ids.customerB,ids.eventB,'SOURCE-B','B']]) {
    const reserved=await asRole(db,null,()=>db.query<{id:string}>(`SELECT id FROM public.reserve_order($1,$2,2,'Test Guest','1234567890',$3)`,[customer,event,code]),'service_role');
    const id=reserved.rows[0].id;
    await asRole(db,null,()=>db.query('SELECT public.bind_payment_order($1,$2,$3)',[customer,id,`order_test${suffix}`]),'service_role');
    const result=await asRole(db,null,()=>db.query<{result:{tickets:{id:string}[]}}>('SELECT public.finalize_payment($1,$2,$3,206000) AS result',[customer,`order_test${suffix}`,`pay_test${suffix}`]),'service_role');
    if(suffix==='A'){ticketA=result.rows[0].result.tickets[0].id;orderA=id;}else ticketB=result.rows[0].result.tickets[0].id;
  }
});
afterAll(async()=>{await db?.close();});
const select=(user:string|null,sql:string,params:unknown[]=[])=>asRole(db,user,()=>db.query<Record<string,unknown>>(sql,params),user?'authenticated':'anon');
const denied=(user:string|null,sql:string,params:unknown[]=[])=>expect(select(user,sql,params)).rejects.toMatchObject({code:'42501'});

describe('migrations and direct PostgreSQL RLS',()=>{
 it('runs the canonical schema migrations and corrected development seed',async()=>{
  const separate=await createDatabase(); await separate.exec(await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8')); await separate.close();
 });
 it('provisions Auth identities as customers and ignores user-supplied role metadata',async()=>{
  const id='10000000-0000-4000-8000-000000000099';
  await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'new@test.invalid','{"role":"super_admin"}')`,[id]);
  expect((await db.query('SELECT role FROM public.users WHERE id=$1',[id])).rows).toEqual([{role:'customer'}]);
  await expect(db.query(`INSERT INTO public.users(id,name,email) VALUES(gen_random_uuid(),'Fake','fake@test.invalid')`)).rejects.toMatchObject({code:'23503'});
 });
 it('enables RLS on every application table',async()=>{
  const result=await db.query<{relrowsecurity:boolean}>(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`);
  expect(result.rows).toHaveLength(12); expect(result.rows.every(r=>r.relrowsecurity)).toBe(true);
 });
 it('rejects anonymous reads of protected data while preserving the public catalog',async()=>{
  await denied(null,'SELECT * FROM public.tickets');
  expect((await select(null,'SELECT id FROM public.events')).rows).toHaveLength(3);
  await denied(null,'SELECT commission_percentage FROM public.venues');
 });
 it.each(['orders','tickets','sources','scans','settlements','venue_staff_assignments','audit_logs'])('isolates owner %s rows to assigned venues',async table=>{
  const query=table==='orders'||table==='tickets'?`SELECT * FROM public.${table} WHERE event_id=$1`:`SELECT * FROM public.${table} WHERE venue_id=$1`;
  expect((await select(ids.owner,query,[table==='orders'||table==='tickets'?ids.eventB:ids.venueB])).rows).toHaveLength(0);
 });
 it('owner cannot see other owner event, venue, customer profile or raw customer account',async()=>{
  expect((await select(ids.owner,'SELECT id FROM public.events WHERE id=$1',[ids.eventB])).rows).toHaveLength(0);
  expect((await select(ids.owner,'SELECT id FROM public.venues WHERE id=$1',[ids.venueB])).rows).toHaveLength(0);
  expect((await select(ids.owner,'SELECT * FROM public.users WHERE id=$1',[ids.customerB])).rows).toHaveLength(0);
  await denied(ids.owner,'SELECT * FROM public.business_venues($1)',[ids.venueB]);
 });
 it('rejects cross-venue event update before any mutation even when caller supplies its own venue',async()=>{
  await denied(ids.owner,'SELECT public.save_event($1,$2,$3)',[{published:false},ids.eventB,ids.venue]);
  expect((await db.query<{published:boolean}>('SELECT published FROM public.events WHERE id=$1',[ids.eventB])).rows[0].published).toBe(true);
 });
 it('rejects cross-venue staff update before any mutation',async()=>{
  await denied(ids.owner,'SELECT public.save_staff_assignment($1,$2,$3)',[{active:false},ids.assignmentB,ids.venue]);
  expect((await db.query<{active:boolean}>('SELECT active FROM public.venue_staff_assignments WHERE id=$1',[ids.assignmentB])).rows[0].active).toBe(true);
 });
 it('rejects assigning a foreign event or a nonstaff identity',async()=>{
  await denied(ids.owner,'SELECT public.save_staff_assignment($1)',[{user_id:ids.staff,venue_id:ids.venue,event_id:ids.eventB}]);
  await expect(select(ids.owner,'SELECT public.save_staff_assignment($1)',[{user_id:ids.customer,venue_id:ids.venue}])).rejects.toMatchObject({code:'22023'});
 });
 it('blocks commission, settlement, attribution, payment, ticket and role writes',async()=>{
  await expect(select(ids.owner,'SELECT public.save_venue($1,$2)',[{commission_percentage:0},ids.venue])).rejects.toMatchObject({code:'22023'});
  for (const user of [ids.owner,ids.staff,ids.customer]) {
    await denied(user,'UPDATE public.settlements SET venue_amount=999999');
    await denied(user,"UPDATE public.orders SET source_code='FORGED'");
    await denied(user,"UPDATE public.orders SET payment_status='PAID'");
    await denied(user,"UPDATE public.tickets SET status='VALID'");
    await denied(user,"UPDATE public.users SET role='super_admin'");
    await denied(user,"INSERT INTO public.audit_logs(actor_user_id,action,entity_type) VALUES(auth.uid(),'fake','fake')");
  }
  await expect(select(ids.owner,'SELECT public.save_event($1,$2)',[{tickets_sold:0},ids.event])).rejects.toMatchObject({code:'22023'});
 });
 it('denies staff financial and admin data including venue commission',async()=>{
  for (const table of ['orders','settlements','sources','audit_logs']) expect((await select(ids.staff,`SELECT * FROM public.${table}`)).rows).toHaveLength(0);
  await denied(ids.staff,'SELECT commission_percentage FROM public.venues');
  await denied(ids.staff,'SELECT * FROM public.business_venues()');
  await denied(ids.staff,'SELECT public.admin_assign_owner($1,$2)',[ids.staff,ids.venue]);
 });
 it('customer can read own tickets/orders and no other customer records',async()=>{
  expect((await select(ids.customer,'SELECT id FROM public.tickets WHERE id=$1',[ticketA])).rows).toHaveLength(1);
  expect((await select(ids.customer,'SELECT id FROM public.tickets WHERE id=$1',[ticketB])).rows).toHaveLength(0);
  expect((await select(ids.customer,'SELECT id FROM public.orders')).rows).toHaveLength(1);
  expect((await select(ids.customer,'SELECT id FROM public.users')).rows).toEqual([{id:ids.customer}]);
 });
 it('inactive and unassigned owners have no business data',async()=>{
  for(const id of [ids.inactive,ids.unassigned]) expect((await select(id,'SELECT id FROM public.events')).rows).toHaveLength(0);
 });
 it('admin and super admin can read permitted platform data, while admin cannot grant admin roles',async()=>{
  for(const user of [ids.admin,ids.superAdmin]) expect((await select(user,'SELECT id FROM public.orders')).rows).toHaveLength(2);
  await denied(ids.admin,'SELECT public.admin_set_user_access($1,$2,true)',[ids.customer,'super_admin']);
 });
 it('owner publishing is allowed and logged atomically with trusted actor/role/venue',async()=>{
  await select(ids.owner,'SELECT public.save_event($1,$2)',[{published:false},ids.eventOther]);
  const rows=(await select(ids.owner,"SELECT actor_user_id,actor_role,venue_id,entity_id FROM public.audit_logs WHERE entity_id=$1 AND action='events.update'",[ids.eventOther])).rows;
  expect(rows).toContainEqual({actor_user_id:ids.owner,actor_role:'venue_owner',venue_id:ids.venue,entity_id:ids.eventOther});
  await denied(ids.owner,"UPDATE public.audit_logs SET action='forged'");
  await expect(db.query("DELETE FROM public.audit_logs")).rejects.toMatchObject({code:'42501'});
 });
 it('admin assignment changes are audited and revocation applies immediately',async()=>{
  await select(ids.admin,'SELECT public.admin_assign_owner($1,$2,false)',[ids.owner,ids.venue]);
  expect((await select(ids.owner,'SELECT id FROM public.events')).rows).toHaveLength(0);
  await denied(ids.owner,'SELECT public.save_event($1,$2)',[{published:true},ids.event]);
  await select(ids.admin,'SELECT public.admin_assign_owner($1,$2,true)',[ids.owner,ids.venue]);
  expect((await select(ids.admin,"SELECT id FROM public.audit_logs WHERE actor_user_id=$1 AND entity_type='venue_owners'",[ids.admin])).rows.length).toBeGreaterThanOrEqual(2);
 });
});

describe('trusted payment, attribution and entry regressions',()=>{
 it('cannot call trusted issuance with anon/customer/staff/owner/admin credentials',async()=>{
  for(const user of [null,ids.customer,ids.owner,ids.staff,ids.admin]) await denied(user,"SELECT public.finalize_payment($1,'order_testA','pay_testA',206000)",[ids.customer]);
 });
 it('issues two unique tickets with bound identity/attribution and totals excluding fees for commission',async()=>{
  const order=(await select(ids.customer,'SELECT * FROM public.orders WHERE id=$1',[orderA])).rows[0];
  expect(order).toMatchObject({customer_id:ids.customer,source_code:'SOURCE-A',quantity:2,subtotal:'2000.00',fees:'60.00',total:'2060.00',payment_status:'PAID'});
  const tickets=(await select(ids.customer,'SELECT * FROM public.tickets')).rows;
  expect(tickets).toHaveLength(2); expect(new Set(tickets.map(t=>t.qr_token)).size).toBe(2);
  expect(tickets.every(t=>t.source_code==='SOURCE-A'&&t.customer_id===ids.customer)).toBe(true);
 });
 it('payment retries are idempotent and different payment or amount is rejected',async()=>{
  const run=(payment:string,amount:number)=>asRole(db,null,()=>db.query("SELECT public.finalize_payment($1,'order_testA',$2,$3)",[ids.customer,payment,amount]),'service_role');
  await run('pay_testA',206000); await run('pay_testA',206000);
  expect((await select(ids.customer,'SELECT id FROM public.tickets')).rows).toHaveLength(2);
  await expect(run('pay_other',206000)).rejects.toMatchObject({code:'42501'});
  await expect(run('pay_testA',1)).rejects.toMatchObject({code:'22023'});
 });
 it('server reservations reject foreign promoter source and invalid quantities',async()=>{
  await expect(asRole(db,null,()=>db.query("SELECT public.reserve_order($1,$2,1,'Guest','1234567890','SOURCE-B')",[ids.customer,ids.event]),'service_role')).rejects.toMatchObject({code:'22023'});
  await expect(asRole(db,null,()=>db.query("SELECT public.reserve_order($1,$2,-1,'Guest','1234567890',NULL)",[ids.customer,ids.event]),'service_role')).rejects.toMatchObject({code:'22023'});
 });
 it('rejects scanning other venue tickets and forged staff assignment',async()=>{
  await denied(ids.staff,'SELECT public.scan_ticket($1,$2)',[ticketB,ids.assignment]);
  await denied(ids.staff,'SELECT public.scan_ticket($1,$2)',[ticketA,ids.assignmentB]);
  await denied(ids.customer,'SELECT public.scan_ticket($1,$2)',[ticketA,ids.assignment]);
 });
 it('assigned staff can scan once; duplicate entry is rejected and attributed correctly',async()=>{
  const first=await select(ids.staff,'SELECT public.scan_ticket($1,$2) AS result',[ticketA,ids.assignment]);
  expect(first.rows[0].result).toMatchObject({result:'VALID',ticket:{id:ticketA,status:'USED'}});
  const second=await select(ids.staff,'SELECT public.scan_ticket($1,$2) AS result',[ticketA,ids.assignment]);
  expect(second.rows[0].result).toMatchObject({result:'ALREADY_USED'});
  const scans=(await select(ids.owner,'SELECT * FROM public.scans WHERE ticket_id=$1',[ticketA])).rows;
  expect(scans).toHaveLength(2);expect(scans.every(s=>s.staff_id===ids.staff&&s.venue_id===ids.venue&&s.event_id===ids.event)).toBe(true);
 });
 it('gate/event scope and inactive staff assignments cannot scan',async()=>{
  const spare=(await db.query<{id:string}>('SELECT id FROM public.tickets WHERE order_id=$1 AND id<>$2',[orderA,ticketA])).rows[0].id;
  await db.query("UPDATE public.tickets SET gate_name='VIP' WHERE id=$1",[spare]);
  await denied(ids.staff,'SELECT public.scan_ticket($1,$2)',[spare,ids.assignment]);
  await db.query('UPDATE public.tickets SET gate_name=NULL WHERE id=$1',[spare]);
  await db.query('UPDATE public.venue_staff_assignments SET active=false WHERE id=$1',[ids.assignment]);
  await denied(ids.staff,'SELECT public.scan_ticket($1,$2)',[spare,ids.assignment]);
  expect((await select(ids.staff,'SELECT id FROM public.tickets')).rows).toHaveLength(0);
 });
});

describe('additional tenant and data integrity regressions',()=>{
 it('allows multiple assigned venues and removes access when each assignment is revoked',async()=>{
  await select(ids.admin,'SELECT public.admin_assign_owner($1,$2,true)',[ids.owner,ids.venueB]);
  expect((await select(ids.owner,'SELECT id FROM public.business_venues()')).rows).toHaveLength(2);
  await select(ids.admin,'SELECT public.admin_assign_owner($1,$2,false)',[ids.owner,ids.venueB]);
  expect((await select(ids.owner,'SELECT id FROM public.business_venues()')).rows).toHaveLength(1);
 });
 it('prevents audit truncation, forged profile inserts and assignment self-grants',async()=>{
  await expect(db.query('TRUNCATE public.audit_logs')).rejects.toMatchObject({code:'42501'});
  await denied(ids.customer,"INSERT INTO public.users(id,name,email,role) VALUES(auth.uid(),'Fake','fake@test.invalid','admin')");
  await denied(ids.owner,'INSERT INTO public.venue_owners(user_id,venue_id) VALUES(auth.uid(),$1)',[ids.venueB]);
  await denied(ids.staff,'INSERT INTO public.venue_staff_assignments(user_id,venue_id) VALUES(auth.uid(),$1)',[ids.venueB]);
 });
 it('unpublished event details remain available to the ticket purchaser only',async()=>{
  await db.query('UPDATE public.events SET published=false WHERE id=$1',[ids.event]);
  expect((await select(ids.customer,'SELECT id FROM public.events WHERE id=$1',[ids.event])).rows).toHaveLength(1);
  expect((await select(ids.customerB,'SELECT id FROM public.events WHERE id=$1',[ids.event])).rows).toHaveLength(0);
  expect((await select(null,'SELECT id FROM public.events WHERE id=$1',[ids.event])).rows).toHaveLength(0);
 });
 it('event-specific staff cannot scan another event at the same venue',async()=>{
  await db.query('UPDATE public.events SET published=true WHERE id=$1',[ids.eventOther]);
  await db.query('UPDATE public.venue_staff_assignments SET active=true WHERE id=$1',[ids.assignment]);
  const order=await asRole(db,null,()=>db.query<{id:string}>("SELECT id FROM public.reserve_order($1,$2,1,'Guest','1234567890',NULL)",[ids.customer,ids.eventOther]),'service_role');
  await asRole(db,null,()=>db.query("SELECT public.bind_payment_order($1,$2,'order_otherEvent')",[ids.customer,order.rows[0].id]),'service_role');
  const issued=await asRole(db,null,()=>db.query<{result:{tickets:{id:string}[]}}>("SELECT public.finalize_payment($1,'order_otherEvent','pay_otherEvent',103000) AS result",[ids.customer]),'service_role');
  await denied(ids.staff,'SELECT public.scan_ticket($1,$2)',[issued.rows[0].result.tickets[0].id,ids.assignment]);
 });
});

describe('existing installation upgrade',()=>{
 it('extends existing profiles without duplicating users or trusting orphan privileged accounts',async()=>{
  const upgraded=await createDatabase(async legacy=>{
   await legacy.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[ids.admin,'existing@test.invalid']);
   await legacy.query("INSERT INTO public.users(id,name,email,role) VALUES($1,'Existing admin','existing@test.invalid','admin'),($2,'Orphan owner','orphan@test.invalid','venue_owner')",[ids.admin,ids.owner]);
  });
  expect((await upgraded.query('SELECT id,role,active FROM public.users ORDER BY id')).rows).toEqual([{id:ids.owner,role:'venue_owner',active:false},{id:ids.admin,role:'admin',active:true}]);
  await upgraded.close();
 });
});
