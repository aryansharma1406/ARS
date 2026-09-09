# ARS — Premium Nightlife Access

Existing customer booking, Owner Portal, staff scanner, admin, promoter attribution, and settlement application. This phase hardens authentication and authorization; it does not redesign the portals.

## Local setup

Use Node.js 22.13 or newer (`nvm use` reads `.nvmrc`).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Populate the required Supabase URL, anon key, server-only service key, application origin, and Razorpay test/live keys. Missing credentials fail closed; there are no demo users, PIN bypasses, mock payments, or in-memory business records. Supabase Auth handles all credentials.

## Database deployment

If the homepage reports missing tables after adding your API keys, the database still needs its schema. Run:

```sh
npm run db:check
npm run db:setup:sql
```

For an **empty project**, open `supabase/setup.sql`, copy its entire contents into that project's Supabase SQL Editor, and run once. This generated script applies both canonical migrations in a single transaction and refreshes the API schema cache. It contains no psql backslash commands, secrets, demo users, or sample financial data. Re-run `npm run db:check` to verify the connection, event/venue relationship and security functions.

Back up an existing database first. The migrations are ordered, one-time changes:

- Existing installations that already have the original schema: apply `supabase/migrations/0002_production_security.sql` in a single transaction.
- Empty Supabase database: `psql "$ARS_DATABASE_URL" -f supabase/schema.sql` applies both migrations atomically. In the Supabase SQL Editor, paste the contents of the two numbered migrations in order inside `BEGIN; ... COMMIT;` (the `schema.sql` wrapper uses psql include directives).
- `supabase/seed.sql` is optional development catalog data. It creates no Auth identities, privileged profiles, payments, or tickets.

The migration extends the existing `users`, `venue_owners`, `venue_staff_assignments`, and audit tables. Legacy profiles without a matching `auth.users.id` are deactivated. The identity foreign key is `NOT VALID` only for legacy rows; all new identities are checked. Review and reconcile legacy users with actual Auth identities, then run `ALTER TABLE public.users VALIDATE CONSTRAINT users_auth_identity_fk;`. No email-based account claiming or automatic role promotion occurs. Resolve any pre-existing duplicate Razorpay IDs before deploying the unique indexes. Preserve legacy orders/tickets while reconciling identities.

## Auth provisioning and portals

Enable Supabase email/password authentication, email confirmation, an appropriate password policy, Auth rate limits, production SMTP, and HTTPS. Configure Site URL to the application origin. Set the signup confirmation email link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Customer registration always creates an active `customer` profile; user metadata cannot assign roles. Role names remain lowercase to match the existing schema: `customer`, `staff`, `venue_owner`, `admin`, `super_admin`. The legacy `promoter` role remains recognized in stored data but gets no protected portal permissions.

Create the initial administrator through Supabase Auth, then explicitly set that verified profile to `super_admin` using the trusted Supabase SQL console. Do not expose service credentials to browsers. Thereafter, authenticated admin server actions `setUserAccess` and `assignVenueOwner` call audited database functions. Only a super admin can grant or change privileged admin roles; users cannot change their own roles. Owners support multiple active venue assignments. Existing Owner Portal staff management assigns already-provisioned active staff accounts and validates venue/event/gate scope.

Routes:

- Customers: `/login`, `/account/tickets`, `/checkout/[eventId]`, `/ticket/[ticketId]`.
- Venue owners: `/owner/login`, `/owner` (active account and venue assignment required).
- Staff: `/staff/login`, `/staff/scanner` (active assignment required).
- Admin and super admin: `/admin/login`, `/admin`. Public navigation does not link to admin.

Sessions use Supabase SSR cookies with HttpOnly, SameSite=Lax, and Secure in production. Middleware refreshes sessions and checks page roles; server pages/actions/APIs independently verify the Supabase user and authoritative profile. RLS and narrow authorized database functions remain the database boundary. Authenticated responses are private and not shared-cacheable. Configure a short access-token lifetime and suitable session timeouts in Supabase; server role and assignment changes are rechecked on subsequent requests.

## Payments, entry and attribution

Checkout reserves an order against server prices and validated venue source attribution, then binds the Razorpay order to that customer. Verification uses that persisted order, constant-time HMAC verification and a Razorpay API check for captured INR payment with the matching amount/order. Retries return the same tickets. Ticket UUIDs and QR tokens are generated by PostgreSQL. Payment secrets are used only by authorized server code.

A database transaction locks the ticket, validates the authenticated staff assignment, records the scan, and transitions VALID to USED at most once. The existing manual scanner and QR pass rendering remain. The original camera viewfinder was a visual placeholder, not a camera decoder; this phase does not add scanner features.

Promoter attribution persists from source to order to ticket to entry. Commission calculations continue to use entry subtotal, excluding convenience fees. Saved settlement records take precedence; unsaved calculations remain PENDING estimates. Owners/staff cannot modify financial status, historical attribution, sales counters, ticket validity, or audit entries directly.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run validate:schema
npm run build
npm audit
```

Database tests execute the exact migrations, grants, policies, triggers, and business functions in PGlite (PostgreSQL compiled to WebAssembly) under anon/authenticated/service roles. API tests invoke real Next route handlers and server authorization with controlled Supabase identity/provider test doubles; they do not claim a live hosted Supabase/Razorpay integration test. Deploy migrations to a staging Supabase project and run a real Razorpay test payment plus entry before production rollout.

Read `docs/security-audit.md` for the initial findings and `docs/security-validation.md` for validation and remaining rollout requirements. The nested `noxpass/` directory is a pre-existing inactive copy, excluded from compilation/linting. Run and deploy the root application.
