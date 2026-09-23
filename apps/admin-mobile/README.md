# ARS Admin mobile V1

Dedicated Expo/React Native admin operations app. This is an implementation awaiting dependency installation, validation, signed builds and physical-device QA. Do not treat it as a verified production release.

## Backend prerequisites

Use the existing ARS Supabase project. Apply the existing portal-session, manual UPI and admin reporting migrations first, then `supabase/migrations/202609240001_admin_mobile.sql`.

The new migration adds a fresh-session admin registration wrapper, read-only dashboard aggregates, restricted push device/job tables and a pending-payment notification trigger. It does not replace payment review, inventory, ticket issuance, settlement, duplicate UTR or authorization functions.

The mobile app calls existing `admin_upi_search`, `admin_upi_details` and `review_manual_upi`. Approval notes are optional; blank notes receive a standard audit note. Rejection reasons require at least three characters. Approvals require a receipt confirmation checkbox and a second confirmation dialog. Network failures never display success: refresh the authoritative payment before retrying.

Signing in replaces the same account's web session, as required by existing single-session policy. Restoring a mobile session never re-registers a replaced session. Dashboard, reports and actions enforce the current backend admin role/session. No service-role credential belongs in this app.

## Local setup

1. Use Node 22 and open this directory.
2. Copy `.env.example` to `.env.local`, then supply the existing project URL and public anon key. Never use the service-role key.
3. Run `npm install`. Run `npx expo install --fix` to align native package versions with the installed Expo SDK before committing the generated lockfile.
4. Run `npm run typecheck` and backend regression/security tests before distributing a build.
5. Use `npm run android` for local Android development or `npm run ios` on a Mac with Xcode/signing configured.
6. Configure an EAS project, set `EXPO_PUBLIC_EAS_PROJECT_ID`, and associate the app with that project. Use `eas build --platform android --profile development` for an internally distributed APK without the development launcher. Use the production profile for store distribution.

No credentials or Google customer authentication are introduced. Provision an active existing admin/super-admin account through the established ARS process.

## Push deployment

- Configure Firebase FCM v1 credentials for `events.ars.admin` and APNs credentials for the iOS bundle ID. A physical signed native build is required for device acceptance testing.
- Enable Expo push access-token security and configure `EXPO_ACCESS_TOKEN` on the WEBSITE SERVER, not in an `EXPO_PUBLIC_*` variable.
- Set a random `ARS_PUSH_CRON_SECRET` of at least 32 characters on the website server.
- Configure a trusted scheduler to POST the deployed HTTPS `/api/internal/admin-push` endpoint every minute with `Authorization: Bearer <ARS_PUSH_CRON_SECRET>`. Do not place this secret in mobile configuration or a public cron URL.
- Tap Enable payment alerts after each mobile sign-in. Registration binds the device to the active admin session. Revoked sessions and inactive/non-admin users cannot receive newly claimed jobs.
- Notifications contain only a generic review alert, not customer details, UTRs, amounts or QR credentials. Opening an alert refreshes the protected pending queue.
- The outbox trigger creates jobs only when UTR submission transitions to pending. Delivery retries up to five claims with five-minute leases; provider receipts are processed on later scheduler runs. DeviceNotRegistered tokens are removed. This is at-least-once notification delivery; a crash after provider acceptance can produce a repeated alert, never a repeated payment approval.
- Monitor scheduler failures, jobs exhausted at five attempts, and provider errors. Push is advisory, not guaranteed instant delivery; the app refreshes every 20 seconds while foregrounded and supports pull-to-refresh.
- Establish an operational retention policy for completed push jobs before a large rollout. No real customer/payment records should be removed as part of notification housekeeping.

## Metric definitions

All Today metrics use database time and the Asia/Kolkata calendar day. Pending totals exclude expired holds and non-pending ledger orders. Approved/rejected totals count manual review decisions today. Tickets Issued Today counts guest-entry ticket rows created today across existing ticket issuance channels, not group QR count. Payment detail and audit are fetched fresh after each action.

## Required release checks (not run in this implementation)

- Dependency installation/lockfile, scanner-independent mobile typecheck and website typecheck/build.
- Admin/super-admin access; denied customer/staff/owner/inactive accounts; revoked and replaced sessions; logout; expired refresh token.
- Dedicated disposable pending payment: approval without note, rejection with reason, already reviewed and expired holds, duplicate concurrent reviews, existing pass/inventory effects and audit attribution.
- Offline/load failure, response lost after successful review, repeated taps, background/foreground and cold start.
- Pagination/empty history, metric boundaries around midnight IST, full detail fields, narrow screens and large accessibility text.
- Android/iOS push permission denied/granted, new UTR alert, locked-device generic content, replaced-session suppression, provider receipts and invalid token cleanup.
- Real-device native build, signing, notification delivery and release acceptance.

Do not approve real customer payments for QA. Use dedicated disposable test orders and the established test infrastructure.
