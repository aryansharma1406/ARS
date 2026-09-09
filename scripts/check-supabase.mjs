import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
  process.exitCode = 1;
} else {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const checks = [
    ['Public event/venue relationship', client.from('events').select('id,venues(name,address)').limit(1)],
    ['Public venue catalog', client.from('venues').select('id,name').limit(1)],
    ['Security migration', client.rpc('app_role')],
  ];
  let missingSchema = false;
  for (const [label, result] of checks) {
    const { error } = await result;
    if (error) {
      console.error(`${label}: FAILED (${error.code || 'connection error'})`);
      if (['PGRST200','PGRST202','PGRST205','42P01','42703','42883'].includes(error.code)) missingSchema = true;
      process.exitCode = 1;
    } else console.log(`${label}: OK`);
  }
  if (missingSchema) console.error('The ARS schema is missing or incomplete. For an empty project: npm run db:setup:sql, then run supabase/setup.sql in its SQL Editor. Existing installations must apply only unapplied migrations.');
}
