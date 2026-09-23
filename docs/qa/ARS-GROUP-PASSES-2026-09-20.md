# ARS group passes - implementation and validation

## Status
Implemented locally; not deployed to hosted Supabase. Website typecheck has a test-only typing blocker. This is not production-ready certification.

## Changes
- Added one random, opaque group QR per multi-guest order in `group_passes`. Purchased, checked-in and generated remaining counts are persisted in PostgreSQL.
- Preserved individual ticket rows as the internal attendance ledger, including their existing payment/tier/CRM relationships. These internal rows still have legacy tokens; the public scanner rejects those tokens for grouped orders and directs users to the Group Pass.
- Group creation hooks into ticket issuance without changing payment finalization arithmetic. Existing multi-guest orders are backfilled with their already-used count; no ticket or prior scan is deleted or reset.
- The existing single-ticket scan function is retained as a private definer primitive. The public entry point routes group QR scans to a validation-only preview. Single-ticket behavior still calls the original primitive, including entry-window validation.
- Group confirmation validates staff/assignment/venue/event/gate, paid order, guest ledger integrity, valid statuses, server-time event window and requested quantity.
- Admissions lock the booking group row, then its guest ledger, before selecting and admitting the requested number. All admissions in one confirmation roll back if any guest validation fails.
- Group request receipts bind staff, assignment, QR hash and entering quantity to a request ID. Replays return the earlier response without another admission.
- Added append-only `group_admissions` quantity audit records alongside the existing per-guest scan records and mobile request receipts. Operational totals and financial calculations remain based on the original ledger.
- Customer My Pass and digital views collapse multi-guest orders to a Group Pass with one displayed QR and entered/remaining counts. Old ticket URLs resolve to the booking Group Pass for the authorized customer.
- Web and Android scanners show group counts and an explicit +/- quantity confirmation. Android pending requests retain quantity in secure storage; the web confirmation retains its request for same-request retry in session storage.
- The earlier entry-window test transaction cleanup blocker is fixed using a test savepoint; no authorization assertions were removed.

## Validation
- Full suite: PASS, 177 tests across 13 files.
- Scanner TypeScript: PASS.
- Website TypeScript: FAIL, two TS18046 errors in `tests/group-passes.test.ts:54`. The audit-query result needs an explicit row type. Application type errors were not reported by this run.
- Isolated database flow: PASS, 10 purchased -> admit 3 -> 7 remain -> admit 4 -> 3 remain -> admit 3 -> 0 remain.
- Fully used group: PASS, rejected without additional admission.
- Web and mobile group preview: PASS, no admission.
- Idempotency and changed-quantity retry: PASS.
- Future, past, overnight and exact entry-window boundaries: PASS.
- Invalid payment, invalid member ticket, wrong event/venue/gate and ownership/RLS: PASS.
- Two authorized staff using stale availability: PASS in a sequential contention model; not a real concurrent-session test.
- Single-ticket regressions: existing current-schema and entry-window suites pass.

## Still unverified
- Genuine simultaneous two-session PostgreSQL admission race. Docker daemon is unavailable; PGlite is not evidence of multi-device concurrency.
- Physical Android group scans and browser end-to-end quantity interaction.
- Hosted Supabase migration application and live backend verification.
- Payment-provider end-to-end checkout; no live payments or real guest admissions were performed.
- Production build/install was not requested or run in this pass.

## Deployment requirements
Apply migrations in repository order, including:
1. `supabase/migrations/202609190001_scan_entry_window.sql`
2. `supabase/migrations/202609200001_group_booking_passes.sql`

Coordinate migration rollout with the updated web and Android clients. Old clients do not understand GROUP_READY, and old group-member QR codes intentionally no longer admit individual guests after migration. Customers must reopen My Pass to obtain their booking QR.

The migration fails rather than silently altering inconsistent legacy quantities. Reconcile such data through the established operational process before rollout. Finish website typecheck and real concurrent-session/device verification before entrance use.
