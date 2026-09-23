# Manual UPI verification

## Deployment required

Apply `supabase/migrations/202609230001_manual_upi.sql` in the same Supabase
project as the website, after the existing ARS migrations (including ticket
tiers and group passes). Deploy the website changes together with this migration.
The new checkout cannot reserve orders until the migration is applied.
Do not run this migration twice. No hosted migration was applied by this task.

Receiving UPI ID: `8087390944@ptaxis`
Payee decoded from the supplied QR: Aryan Kumar
QR asset: `public/payments/ars-upi.jpeg`

The uploaded QR is static and does not contain an amount. Checkout displays the
exact server-reserved order total, including discounts and fees. The optional
Open UPI app link includes that amount. Receipt still requires manual bank checks.

## Customer flow

1. Continue to UPI reserves the order using existing pricing, coupon, referral,
   tier-capacity and 15-minute initial reservation rules. No ticket is issued.
2. The customer pays and submits a UTR before that initial deadline.
3. Submission starts the configured verification hold (default 60 minutes).
4. The payment page shows Payment Verification Pending. My Pass links to
   Payments & verification status so the customer can return later.
5. Admin approval changes the displayed state to Payment Verified and issues the
   pass through existing fulfillment, including existing group-pass triggers.

## Administration

Open Admin > UPI Verification (`/admin/payments`). Match the UTR, exact amount
and receiving account against the bank record, add a review note, confirm that
receipt was checked, and approve. A UTR is not proof of payment by itself.

Reject releases the reservation immediately. Rejection does not initiate a refund.
Change the hold setting here (5-1440 minutes). It only affects subsequent UTR
submissions, never existing deadlines. Settings and review decisions are audited.

## Inventory and security

- The database clock governs submission and approval deadlines.
- Expired pending reservations no longer count towards held inventory using the
  existing reservation_expires_at queries. No scheduler or open browser is needed.
- Expired records remain in the ledger; their displayed status is derived as
  expired. They are not silently approved or deleted.
- An expired hold cannot be revived by resubmitting a UTR or approving late.
  Reconcile payments separately if money arrived but no pass was issued.
- UTRs are trimmed, uppercased and uniquely constrained globally, including
  rejected/expired submissions. Same-order retries do not extend the hold.
- Order and event row locks serialize submissions and approval. Existing event
  and tier fulfillment checks remain active.
- Creation retries use a customer/request ID to avoid duplicate reservations.
- Customers can only read/submit their own records; only admins can review or
  change hold settings. New tables have RLS and no direct authenticated writes.
- The established order payment_status remains PENDING/PAID/FAILED/REFUNDED for
  compatibility with accounting, inventory and scanner checks. Manual review
  state and audit records are stored separately.
- Existing fulfillment uses its existing provider-reference columns with
  manual_upi_order_/manual_upi_ prefixes; these do not represent Razorpay receipts.
- New web checkouts no longer invoke Razorpay or auto-fulfill in test-payment
  mode. Legacy Razorpay verification is retained for already-created payments.
- No real payments, approvals, guest tickets or check-ins were performed here.

## Validation outstanding

Typecheck, automated tests, migrated-database tests and browser E2E were not run.
Before accepting real payments, test in an isolated database:

1. Reservation and UTR submission issue zero tickets.
2. A valid admin approval issues the correct single/group pass exactly once.
3. Duplicate UTRs across orders, casing variants and concurrent submissions fail.
4. Repeated same-order submission/approval remains idempotent.
5. Rejection and server-time expiry release both event and tier inventory.
6. Late approval cannot issue tickets or reclaim sold inventory.
7. Admin hold settings persist and leave existing holds unchanged.
8. Customer, owner and staff cannot approve payments or change settings.
9. Customers cannot access another customer's payment or submit its UTR.
10. Coupon/referral amounts, group quantities and paid accounting remain correct.
11. Network retries and mobile payment/verification screens behave correctly.

Existing checkout integration tests that assume automatic Razorpay/test-payment
fulfillment will need deliberate coverage updates; none were removed or skipped.
