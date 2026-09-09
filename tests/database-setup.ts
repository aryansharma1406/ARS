import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFile } from 'node:fs/promises';

export async function createDatabase(beforeSecurity?: (db: PGlite) => Promise<void>) {
  const db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
  `);
  await db.exec('BEGIN');
  for (const file of ['0001_existing_schema.sql','0002_production_security.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
    if (file === '0001_existing_schema.sql' && beforeSecurity) await beforeSecurity(db);
  }
  await db.exec('COMMIT');
  return db;
}
export const ids = {
  customer:'10000000-0000-4000-8000-000000000001',customerB:'10000000-0000-4000-8000-000000000002',
  owner:'10000000-0000-4000-8000-000000000003',ownerB:'10000000-0000-4000-8000-000000000004',
  staff:'10000000-0000-4000-8000-000000000005',admin:'10000000-0000-4000-8000-000000000006',
  superAdmin:'10000000-0000-4000-8000-000000000007',inactive:'10000000-0000-4000-8000-000000000008',
  unassigned:'10000000-0000-4000-8000-000000000009',staffUnassigned:'10000000-0000-4000-8000-000000000010',
  venue:'20000000-0000-4000-8000-000000000001',venueB:'20000000-0000-4000-8000-000000000002',
  event:'30000000-0000-4000-8000-000000000001',eventB:'30000000-0000-4000-8000-000000000002',eventOther:'30000000-0000-4000-8000-000000000003',
  assignment:'40000000-0000-4000-8000-000000000001',assignmentB:'40000000-0000-4000-8000-000000000002',
};
export async function seed(db:PGlite) {
  for (const [name,role] of Object.entries({customer:'customer',customerB:'customer',owner:'venue_owner',ownerB:'venue_owner',staff:'staff',admin:'admin',superAdmin:'super_admin',inactive:'venue_owner',unassigned:'venue_owner',staffUnassigned:'staff'})) {
    await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{"role":"super_admin","name":"Test user"}')`,[ids[name as keyof typeof ids],`${name}@test.invalid`]);
    await db.query('UPDATE public.users SET role=$2,active=$3 WHERE id=$1',[ids[name as keyof typeof ids],role,name!=='inactive']);
  }
  for (const [id,name] of [[ids.venue,'Venue A'],[ids.venueB,'Venue B']]) {
    await db.query(`INSERT INTO public.venues(id,name,location,address,commission_percentage) VALUES($1,$2,'Goa','Test address',20)`,[id,name]);
  }
  for (const [id,venue] of [[ids.event,ids.venue],[ids.eventB,ids.venueB],[ids.eventOther,ids.venue]]) {
    await db.query(`INSERT INTO public.events(id,venue_id,name,date,start_time,end_time,ticket_price,ticket_capacity,age_limit) VALUES($1,$2,'Test event',CURRENT_DATE+1,'21:00','04:00',1000,100,21)`,[id,venue]);
  }
  await db.query(`INSERT INTO public.venue_owners(user_id,venue_id) VALUES($1,$2),($3,$4),($5,$2)`,[ids.owner,ids.venue,ids.ownerB,ids.venueB,ids.inactive]);
  await db.query(`INSERT INTO public.venue_staff_assignments(id,user_id,venue_id,event_id,gate_name) VALUES($1,$2,$3,$4,'Main'),($5,$2,$6,$7,'Main')`,[ids.assignment,ids.staff,ids.venue,ids.event,ids.assignmentB,ids.venueB,ids.eventB]);
  // Second assignment belongs to another staff account; the test actor only has Venue A access.
  await db.query('UPDATE public.venue_staff_assignments SET user_id=$1 WHERE id=$2',[ids.staffUnassigned,ids.assignmentB]);
  await db.query(`INSERT INTO public.sources(venue_id,name,code,commission_percentage) VALUES($1,'Promoter A','SOURCE-A',20),($2,'Promoter B','SOURCE-B',10)`,[ids.venue,ids.venueB]);
  await db.query(`INSERT INTO public.settlements(venue_id,event_id,gross_revenue,eligible_revenue,commission_percentage,commission_amount,venue_amount) VALUES($1,$2,1000,1000,20,200,800),($3,$4,1000,1000,20,200,800)`,[ids.venue,ids.event,ids.venueB,ids.eventB]);
}
export async function asRole<T>(db:PGlite,userId:string|null,query:()=>Promise<T>,role='authenticated'):Promise<T> {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[userId || '']);
  try { return await query(); }
  finally { await db.exec('RESET ROLE'); await db.query(`SELECT set_config('request.jwt.claim.sub','',false)`); }
}
