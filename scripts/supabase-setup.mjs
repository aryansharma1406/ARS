import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function buildSetupSql() {
  const migrations = await Promise.all(['0001_existing_schema.sql', '0002_production_security.sql'].map(name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')));
  return `-- ARS: paste this entire generated file into your empty project's Supabase SQL Editor and run once.
-- Generated from the canonical numbered migrations. Do not edit this copy.
-- No seed data, passwords, API keys, or privileged accounts are included.
BEGIN;
DO $ars_setup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN
    ('users','venues','events','sources','orders','tickets','scans','settlements','venue_owners','venue_staff_assignments','audit_logs','owner_notification_preferences')) THEN
    RAISE EXCEPTION 'ARS tables already exist. Apply only unapplied numbered migrations; do not run the empty-project setup again.';
  END IF;
END $ars_setup$;

${migrations.join('\n\n')}

NOTIFY pgrst, 'reload schema';
COMMIT;
`;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const destination = new URL('../supabase/setup.sql', import.meta.url);
  await writeFile(destination, await buildSetupSql());
  console.log(`Created ${fileURLToPath(destination)}\nRun the entire file once in the Supabase SQL Editor for the empty project. Then run npm run db:check.`);
}
