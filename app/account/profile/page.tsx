import Link from 'next/link';
import { requirePage, requireRole } from '@/lib/auth';
import MobileCustomerAuth from '@/components/auth/MobileCustomerAuth';
export const dynamic = 'force-dynamic';
export default async function AccountProfile() {
  const customer = await requirePage(() => requireRole('customer'), '/login', '/account/profile');
  const { data: { user } } = await customer.client.auth.getUser();
  const phone = user?.phone_confirmed_at && user.phone ? `+${user.phone.replace(/^\+/, '')}` : '';
  const verifiedEmail = user?.email_confirmed_at ? user.email : '';
  return <main className="mx-auto max-w-5xl space-y-8 px-5 py-12">
    <header><p className="eyebrow">ARS / Your membership</p><h1 className="mt-4 text-4xl font-black">Your account.</h1><p className="mt-4 text-sm text-zinc-400">Manage your verified identity without changing your passes or purchase history.</p><Link href="/account/tickets" className="editorial-link mt-5 inline-block">Open My Pass</Link></header>
    <div className="grid gap-4 border-y border-white/10 py-6 sm:grid-cols-2">{verifiedEmail && <div><p className="eyebrow">Verified email</p><p className="mt-3 break-all text-zinc-300">{verifiedEmail}</p></div>}{phone && <div><p className="eyebrow">Verified mobile</p><p className="mt-3 text-[#e2d4ae]">{phone}</p></div>}</div>
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/account/onboarding?next=%2Faccount%2Fprofile" className="ars-button ars-button-secondary">Edit name & discovery area</Link>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="ars-button ars-button-secondary">Sign out</button>
      </form>
    </div>
    {!verifiedEmail && <MobileCustomerAuth linking/>}
    <p className="text-xs leading-6 text-zinc-500">Your verified account keeps your membership and passes together. <Link href="/account/marketing" className="text-[#cbb88a] underline">Manage message consent or opt out.</Link></p>
  </main>;
}
