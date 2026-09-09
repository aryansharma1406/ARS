import type { CatalogIssue } from '@/lib/catalog';
export default function CatalogUnavailable({issue}:{issue:CatalogIssue}) {
  const needsSetup = process.env.NODE_ENV === 'development' && issue === 'setup';
  return <div role="status" className="border border-white/10 px-6 py-16 text-center"><h3 className="text-2xl font-black uppercase text-white">{needsSetup?'Database setup required':'Listings temporarily unavailable'}</h3><p className="mt-2 text-zinc-500">{needsSetup?'The Supabase connection is configured, but the ARS schema is missing. Generate the setup SQL with npm run db:setup:sql and run it in the project’s SQL Editor.':'We couldn’t load the event listings. Please try again shortly.'}</p></div>;
}
