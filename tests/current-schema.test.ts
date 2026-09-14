import {beforeAll,afterAll,it,expect} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {createDatabase,seed,asRole,ids} from './database-setup';
let db:PGlite;
beforeAll(async()=>{db=await createDatabase(undefined,true);await seed(db);});
afterAll(async()=>{await db?.close();});
it('applies every migration and enables RLS on every application table',async()=>{
 const rows=(await db.query<{tablename:string;rowsecurity:boolean}>("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'")).rows;
 expect(rows.length).toBeGreaterThan(17);expect(rows.every(row=>row.rowsecurity)).toBe(true);
 for(const table of ['event_pass_tiers','portal_login_sessions','staff_scan_requests','customer_location_preferences','marketing_campaigns'])expect(rows.some(row=>row.tablename===table)).toBe(true);
});
it('registers verified business sessions and rejects the replaced session in database authorization',async()=>{
 const first='60000000-0000-4000-8000-000000000001',second='60000000-0000-4000-8000-000000000002';
 await db.query("INSERT INTO auth.sessions(id,user_id,created_at) VALUES($1,$3,now()-interval '1 minute'),($2,$3,now())",[first,second,ids.owner]);
 const register=(session:string)=>asRole(db,null,()=>db.query("SELECT public.register_portal_session($1,$2,'owner','test')",[ids.owner,session]),'service_role');
 await register(first);await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({session_id:first})]);
 expect((await asRole(db,ids.owner,()=>db.query<{valid:boolean}>('SELECT public.portal_session_valid() AS valid'))).rows[0].valid).toBe(true);
 await register(second);
 expect((await asRole(db,ids.owner,()=>db.query<{role:string}>('SELECT public.app_role() AS role'))).rows[0].role).toBe('session_revoked');
 await expect(register(first)).rejects.toMatchObject({code:'42501'});
 await db.query("SELECT set_config('request.jwt.claims','{}',false)");
});
it('keeps current ticket issuance service-only and marketing private',async()=>{
 await expect(asRole(db,ids.customer,()=>db.query("SELECT public.reserve_tier_order($1,$2,NULL,1,'Guest','1234567890',NULL,NULL,1030,NULL)",[ids.customer,ids.event]))).rejects.toMatchObject({code:'42501'});
 await expect(asRole(db,null,()=>db.query('SELECT * FROM public.customer_marketing_preferences'),'anon')).rejects.toMatchObject({code:'42501'});
 expect((await asRole(db,ids.staff,()=>db.query('SELECT * FROM public.marketing_campaigns'))).rows).toEqual([]);
});
it('reserves the selected tier, finalizes once and records approved then duplicate scans',async()=>{
 const tier=(await db.query<{id:string}>('SELECT id FROM public.event_pass_tiers WHERE event_id=$1',[ids.event])).rows[0].id;
 const reserved=await asRole(db,null,()=>db.query<{id:string}>("SELECT id FROM public.reserve_tier_order($1,$2,$3,1,'Guest','1234567890',NULL,NULL,1030,NULL)",[ids.customer,ids.event,tier]),'service_role');
 const order=reserved.rows[0].id;
 await asRole(db,null,()=>db.query("SELECT public.bind_payment_order($1,$2,'order_current')",[ids.customer,order]),'service_role');
 const result=await asRole(db,null,()=>db.query<{result:{tickets:{id:string}[]}}>("SELECT public.finalize_payment($1,'order_current','pay_current',103000) AS result",[ids.customer]),'service_role');
 const ticket=result.rows[0].result.tickets[0].id;
 expect((await db.query<{ticket_tier_id:string}>('SELECT ticket_tier_id FROM public.tickets WHERE id=$1',[ticket])).rows[0].ticket_tier_id).toBe(tier);
 const scan=()=>asRole(db,ids.staff,()=>db.query<{result:{result:string}}>('SELECT public.scan_ticket($1,$2) AS result',[ticket,ids.assignment]));
 expect((await scan()).rows[0].result.result).toBe('VALID');expect((await scan()).rows[0].result.result).toBe('ALREADY_USED');
 expect((await db.query('SELECT id FROM public.scans WHERE ticket_id=$1',[ticket])).rows).toHaveLength(2);
});
