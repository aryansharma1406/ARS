# ARS authentication and authorization audit

Scope: the active application at `/Users/aryansharma/Desktop/noxpass`. The nested `noxpass/` directory is an older unused copy, excluded from compilation and linting; no application rebuild or Owner Portal feature work is in scope.

Audit completed before implementation:

- Supabase dependencies exist, but `lib/store.ts` uses only process memory; admin client components import and mutate their own demo stores. No durable payment, entry, or audit persistence.
- `public.users` already contains roles, but has no Auth identity foreign key or active status. Existing owner/staff assignment and audit tables can be extended.
- Owner authentication issues a separate signed cookie with a known fallback secret and public demo credentials; it does not revalidate identity or revoked assignments. Middleware checks only cookie existence.
- Admin has no server guard. Public navigation links to `/admin`. Staff starts authenticated, accepts arbitrary PINs, and trusts a browser staff ID. Tickets are accessible by guessed ID or token without customer authentication.
- Owner event/staff PATCH handlers update the resource before testing its venue. Owner data queries load all tenants before filtering. Staff with no assignments can scan any ticket.
- RLS lacks complete customer, staff, and admin policies. Owner event `FOR ALL` permits edits to sales counters; owner staff writes do not validate event/venue consistency. Owners can append arbitrary audit entries.
- Checkout accepts the client's amount and later unbound event/quantity/customer/attribution data. Missing credentials and mock order IDs bypass payment verification; SDK failures fall back to fake payments. Ticket issuance and scans are nontransactional and replayable.
- Existing settlement math uses ticket subtotal excluding fees; preserve that rule. Existing scanner includes manual token entry and a simulated camera frame, not a working camera decoder.
- Seed data contains invalid UUIDs and fabricated privileged users. No migrations, authorization tests, or configured lint rules exist. Next.js 15.1.7 has critical published vulnerabilities.

Implementation uses existing tables, Supabase Auth, authenticated RLS clients, narrow authorized database functions, atomic audit triggers, and service credentials only for payment operations after server authorization. Missing production configuration fails closed.

Reference checks:
- [Supabase server client and verified identity guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Razorpay payment gateway flow and payment capture](https://razorpay.com/docs/payments/payment-gateway/how-it-works/)
- [Next.js security update](https://nextjs.org/blog/security-update-2025-12-11)
