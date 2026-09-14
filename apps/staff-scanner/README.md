# ARS Staff Scanner

Dedicated Expo / React Native / TypeScript staff application. It uses the existing ARS Supabase project and calls the existing `scan_ticket` function through an authenticated mobile wrapper. There is no separate ticket or customer database and no payment or settlement implementation here.

## Setup

1. Apply the existing ARS migrations, then `supabase/migrations/202609140002_mobile_staff_scanner.sql` to the same Supabase project used by the website.
2. In this directory, create `.env` using `.env.example`. Supply the project URL and public anon/publishable key only. Never include a service-role key.
3. Install and align Expo dependencies:

```sh
cd /Users/aryansharma/Desktop/noxpass/apps/staff-scanner
npm install
npx expo install --fix
```

4. Run a development build on a physical phone:

```sh
npm run android
# Or, with Xcode and iOS signing configured:
npm run ios
# Start Metro for an installed development client:
npx expo start --dev-client
```

The app connects directly to Supabase, not localhost:3000. Use an existing active Staff account with an active venue/gate assignment. Customer, Owner and Admin accounts cannot use the mobile RPCs.

For a distributable Android preview, configure your Expo/EAS project and signing first, then run `eas build --platform android --profile preview`. iOS distribution requires Apple signing/provisioning. The supplied application identifier is `events.ars.staffscanner`; confirm ownership before publishing. No binary, signing configuration or store submission is included.

## Entrance operation

- Camera remains mounted after a scan. Only one verification is in flight, followed by a short cooldown. A QR held in view is suppressed until removed or replaced.
- Successful server responses show ENTRY APPROVED, ALREADY CHECKED IN or INVALID TICKET, plus available guest/pass/event details.
- No offline approval. A network failure leaves an unresolved request securely saved on the phone. Retry uses its original request ID, including after restarting the app.
- A replayed approval is explicitly marked as a recovered result: staff must not admit a guest twice.
- Gate selection is restricted to the signed-in staff member's active assignments. Unresolved requests block switching gates.
- Torch, manual token entry, permission handling, pause/resume and sign-out are available.
- Camera is unmounted in the background. Authentication refresh follows application foreground state.

## Backend and audit

`mobile_staff_context` returns only the staff identity and assigned operational scopes. `mobile_staff_stats` returns operational totals. `mobile_scan_ticket` checks active staff/venue/assignment, then invokes the unchanged `scan_ticket` function. Existing ticket locking remains responsible for preventing simultaneous admission across devices.

The existing `scans` table records outcomes. Authorized invalid requests without a matching ticket are also logged with nullable ticket/event references. Requests that never reach the server cannot be recorded there. Unauthorized callers do not receive ticket details.

`staff_scan_requests` stores idempotency receipts and hashed tokens, not raw QR values. It is inaccessible directly to client roles. Pending raw tokens exist only in encrypted device storage until resolution. Authentication tokens use a chunked SecureStore adapter; passwords are not persisted by the application.

No financial data is requested by the app. Existing database permissions remain in effect; the app does not broaden staff RLS access.

## Tonight's figures

Totals refresh approximately every 15 seconds and after a scan. Tonight means published events dated today in IST, plus yesterday's overnight events still running. Event-specific assignments narrow the scope. Figures cover all gates for these events, not a fabricated gate capacity.

Checked in counts used passes on paid orders; remaining counts valid unscanned paid passes. Capacity is the assigned events' total configured capacity. Remaining is not capacity minus admissions. Stale/unavailable figures are labelled. Scanning speed depends on camera readability, connectivity and server latency.

## Release checks still required

This source has not been installed, typechecked, built or tested on a device. The migration has not been applied by this implementation.

Before real entrance use, exercise two devices scanning one ticket simultaneously; duplicate and invalid tickets; wrong gate/venue; revoked access; network timeout and same-request recovery; restart with a pending request; denied camera permission; background/resume; overnight totals; and narrow-screen readability. Review database migration deployment and existing staff policies with the project administrator.

## References

- [Expo Camera](https://docs.expo.dev/versions/v56.0.0/sdk/camera/)
- [Expo SecureStore](https://docs.expo.dev/versions/v56.0.0/sdk/securestore/)
- [Supabase React Native authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native)
