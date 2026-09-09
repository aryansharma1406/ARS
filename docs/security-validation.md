# ARS security validation — 2026-09-09

## Completed locally

- `npm run typecheck`: passed (Next route generation plus strict TypeScript).
- `npm run lint`: passed, zero warnings and zero errors.
- `npm test`: 76 tests passed across five test files.
- Migration validation: exact ordered SQL applied to PostgreSQL through PGlite; fresh bootstrap, corrected seed, and existing-profile upgrade tested. All 12 application tables have RLS enabled and forced.
- Production build: passed on Node 22.23.2 / Next 15.5.25. All existing portal routes generated successfully. Node 22.13+ is the deployment requirement.
- `npm audit`: zero reported vulnerabilities, including development dependencies. PostCSS is pinned through an override to the patched 8.5.28 version.
- Production HTTP smoke: `/owner`, `/admin`, `/staff/scanner`, and ticket pages return 503 without Supabase configuration even when supplied with a forged legacy owner cookie. All four login pages return 200. Owner, scanner, and checkout APIs return 503 with `AUTH_UNAVAILABLE`; a cross-origin mutation returns 403.
- Browser production chunks checked for old demo-session secrets, demo stores, mock-payment bypasses, staff identity overrides, and service-role strings; none found.

The API tests call actual route handlers, middleware and server authorization helpers with controlled Supabase identity/provider doubles. Database tests run actual PostgreSQL policies, grants, security-definer functions, transactions, and audit triggers under `anon`, `authenticated`, and `service_role`. PGlite uses one database connection; duplicate/replay behavior is exercised, but real multi-connection load testing is still a staging check. The initial validation above ran without live credentials; the follow-up below records subsequent Supabase setup.

## Homepage data-service fix — 2026-09-09

- Confirmed the configured Supabase credentials were valid, but the project lacked the ARS tables and security functions (`PGRST205` and `PGRST202`).
- Generated a SQL Editor setup script from both canonical migrations, with a transaction and a guard against applying the bootstrap to an existing application schema. Applied it successfully to the configured ARS project; no sample events or privileged accounts were inserted.
- `npm run db:check`: public event/venue relationship, venue catalog, and security function checks all passed against the live project.
- Local homepage and events page both returned HTTP 200 with the normal empty catalog. Verified the homepage in the browser with no runtime error overlay.
- Public catalog pages now show a controlled unavailable state for data-service failures. Missing-schema errors are distinguished from other outages; protected access checks still fail closed.
- Regression validation: 87 tests passed, TypeScript and lint passed, and the production build passed in an isolated directory without interrupting the running development server.

## Required access scenarios

| Scenario | Result / evidence |
|---|---|
| Logged-out → owner/admin | Denied; verified identity required; configured middleware redirects to login |
| Customer → owner/admin/staff | 403 |
| Staff → owner/admin | 403 |
| Owner → admin | 403 |
| Owner A → B's venue/events/orders/tickets/customers/sources/scans/settlements/staff/audit | RLS hides foreign rows; requested foreign venue/resource APIs and mutations return 403 |
| Foreign event/staff ID paired with own venue ID | 403 before mutation; original foreign record unchanged |
| Owner modifies commission, settlement amount, attribution, sales counter, payment/ticket/scan status | Denied by grants, whitelist checks, role checks, or trusted-function execution permissions |
| Staff → financial/admin data | Denied, including raw venue commission columns |
| Staff → assigned ticket | VALID and one entry recorded with authenticated staff ID |
| Staff → duplicate QR | ALREADY_USED; API 409 |
| Staff → wrong venue/event/gate, another staff assignment, inactive assignment | Denied |
| Customer → own ticket | Allowed |
| Customer → other's ticket/account/order | Denied |
| Owner multi-venue assignment / revocation | Only active assigned venues allowed; revocation effective on subsequent checks |
| Inactive/unassigned profiles | No privileged data; controlled account/assignment errors |
| User metadata requests privileged signup role | Ignored; profile provisioned as CUSTOMER |
| Legacy user without matching Auth identity | Deactivated; new orphan profile inserts rejected |
| Payment signature tampering/mock signature/missing secret | Rejected |
| Browser overrides price, customer, event, quantity or attribution at verification | Rejected |
| Bound captured payment retry | Same order and tickets; no duplicate issuance |
| Audit append/update/delete/truncate forgery | Denied; trusted actor/role/venue/action/resource recorded atomically |
| CSV formula injection | Neutralized during existing exports |

The existing subtotal-only commission calculation is retained. Persisted settlements are read without recalculation; unsaved calculations are PENDING estimates. Authentication additions include the customer account/pass list and separate login screens, with existing portal layouts retained.

## Remaining rollout requirements and limits

1. The configured ARS Supabase project now has both migrations applied. Apply any unapplied migrations to other deployment projects and configure their credentials. Razorpay remains unconfigured locally, so payments intentionally fail closed. Supabase Auth email confirmation templates, SMTP, password policy, rate limits and session expiry must be configured in the project.
2. Reconcile legacy profiles and any pre-existing duplicate payment IDs before migration rollout; validate the legacy identity FK after reconciliation. Provision real owner/staff accounts and assignments. Use a trusted operator to bootstrap the first SUPER_ADMIN; there are no seeded privileged credentials.
3. Run real sign-in/refresh/sign-out and Razorpay test payment → persisted ticket → QR → staff entry against the deployed Supabase project. Public PostgREST reads and the security function were verified live; hosted Auth flows, email delivery and actual gateway/camera hardware remain unverified.
4. Pre-existing payment recovery/webhook reconciliation and automated refund handling are absent. A captured payment whose browser callback never reaches verification, or which is verified after its capacity reservation expires and inventory is exhausted, requires trusted operator reconciliation. This phase adds no unauthenticated webhook or financial mutation endpoint. Failed gateway initialization can leave an unpaid reservation that expires after 15 minutes.
5. The existing scanner camera viewfinder is a placeholder. Manual ticket/token entry and generated QR passes are preserved. Camera decoding was not part of this authentication phase.
6. The pre-existing nested `noxpass/` copy still contains legacy code and is excluded from the active app's compilation and linting. Deploy only the root application. No repository history was available because the workspace is not a Git checkout.
