import type { CatalogIssue } from '@/lib/catalog';
export default function CatalogUnavailable({issue}:{issue:CatalogIssue}) {
  const development = process.env.NODE_ENV === 'development';
  const permissions = development && issue === 'permissions';
  const setup = development && issue === 'setup';
  return <div role="status" className="border border-white/10 px-6 py-16 text-center">
    <h3 className="text-2xl font-black uppercase text-white">{permissions ? 'Public listing access needs updating' : setup ? 'Database configuration needs attention' : 'Listings temporarily unavailable'}</h3>
    <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{permissions
      ? 'The database is blocking public catalog reads. Apply supabase/migrations/0009_public_catalog_permissions.sql in the connected Supabase project, then refresh. Do not rerun setup.sql or grant public access to owner assignments.'
      : setup ? 'Check the Supabase configuration and apply any missing numbered migrations. Existing projects must not rerun the full setup.sql file.'
      : 'We could not load the event listings. Please try again shortly.'}</p>
  </div>;
}
