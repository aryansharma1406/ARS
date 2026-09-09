-- Canonical psql bootstrap. For the Supabase SQL Editor, execute the contents of
-- both numbered migrations in order inside a single BEGIN / COMMIT transaction.
-- Existing installations apply only unapplied migrations. Do not replay 0001.
\set ON_ERROR_STOP on
BEGIN;
\ir migrations/0001_existing_schema.sql
\ir migrations/0002_production_security.sql
COMMIT;
