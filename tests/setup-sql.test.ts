import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {uuid_ossp} from '@electric-sql/pglite/contrib/uuid_ossp';
import {buildSetupSql} from '../scripts/supabase-setup.mjs';
it('generates SQL Editor-compatible transactional setup, with an existing-data guard and schema reload',async()=>{
 const sql=await buildSetupSql();
 expect(sql).not.toMatch(/^\\/m);
 expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
 expect(sql).toContain('ARS tables already exist');
 const db=new PGlite({extensions:{uuid_ossp}});
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  await db.exec(sql);
  expect((await db.query('SELECT * FROM public.events')).rows).toEqual([]);
  expect((await db.query<{count:number}>("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public' AND rowsecurity")).rows[0].count).toBe(17);
  await expect(db.exec(sql)).rejects.toMatchObject({message:expect.stringContaining('ARS tables already exist')});
  await db.exec('ROLLBACK');
 } finally {await db.close();}
},30000);
