# Customer mobile authentication rollout

## Required setup (not performed automatically)

1. Apply `202609130001_customer_marketing.sql` if it is not already applied, then apply only the new `202609130002_customer_mobile_auth.sql`. Do not rerun the full historical setup against a populated project. Back up first.
2. Enable Phone Auth and configure a supported SMS provider in Supabase. Keep phone confirmation enabled. Configure SMS expiry, resend limits and verification rate limits. Do not enable automatic phone confirmation or production test OTPs.
3. Keep Email Auth available. The Magic Link email template must display `{{ .Token }}` so existing customers can use an email code. The Change Email template must also display its OTP. Keep secure email change enabled; both email addresses may require confirmation. Existing email-link routes remain available.
4. Keep Google enabled with the existing callback URL and origin configuration. No Owner/Admin/Staff provider or password settings are changed.
5. Before a public rollout configure provider spending caps and Supabase abuse limits. If CAPTCHA is enabled in Supabase, connect the chosen CAPTCHA widget and pass its token to the OTP endpoint before enabling this UI for the public. The endpoint accepts a captchaToken, but this change does not install a CAPTCHA widget.

Provider reference: https://supabase.com/docs/guides/auth/phone-login

## Existing customers

Sign in using the original email code or Google identity, open Account, then verify the mobile there. Supabase `updateUser` plus `verifyOtp` with `phone_change` binds that number to the same auth UUID. Tickets, orders, marketing and CRM references keep that UUID. Never link an account just because a booking or CRM phone matches. Numbers already attached to another auth account require support; there is no automatic merge.

The Create account checkbox explicitly enables a new phone account. Do not select it to recover an existing account's tickets. Phone identities with no email use NULL in the account record; order/ticket email snapshots remain empty strings. Historical rows are not rewritten. My Pass remains accessible to existing email/Google customers even before linking a phone.

## Scope and verification

Customer login/signup now use OTP. Legacy customer password endpoints and password recovery remain for compatibility, but are no longer the primary UI. Owner/Admin/Staff routes and RBAC/RLS policies are unchanged. The additive migration changes only identity/contact compatibility and explicit WhatsApp consent, not financial calculations or QR generation.

Not run: migrations, SMS sends, email sends, login verification, builds or tests. Before rollout, test new mobile signup, existing mobile login, invalid/expired/replayed codes, resend throttling, original-email linking with the same UUID and ticket history, duplicate-number rejection, Google access, non-customer rejection, phone-only checkout, consent/opt-out, CRM separation, and all operational portal logins.

## Name and discovery onboarding

Apply `202609130003_customer_onboarding.sql` after the preceding customer migrations. New customers with an empty profile name are sent to `/account/onboarding` after OTP verification; existing profiles and their destinations are preserved. Customers can update their name and discovery area from Account. Optional email uses Supabase email-change verification, not an unverified account merge.

Location is requested only when Use my location is pressed, using getCurrentPosition (never watchPosition), with high accuracy disabled and a ten-second timeout. Coordinates are rounded to two decimals before application use and stored only in sessionStorage, with a one-hour freshness limit. Skip clears the browser discovery selection and continues. Denial/error allows manual area selection or normal use. A manually selected area is stored separately for discovery/area-level analytics; GPS coordinates are not sent to the database. No automated reverse-geocoding or third-party location service is used.

Populate the optional public.venues latitude/longitude fields with actual venue map positions using a trusted administrator workflow. This change does not invent coordinates or add a venue-coordinate editor. Until map positions are recorded, distance recommendations explicitly remain unavailable and manual area selection remains usable. `/events` shows distance-ordered venue discovery links without changing existing booking or event filtering rules.

No migrations, authentication tests, or geolocation/browser tests were run for this change.

## Post-login location popup

Apply `202609130004_customer_location.sql` to enable saving the post-login popup choice. Customer OTP and Google logins now open `/account/location` immediately before their original destination. New customers then finish name/email onboarding without a second location prompt. Operational portal authentication is unchanged.

The ARS popup opens automatically; Allow location invokes the browser permission request. Browser decisions cannot be overridden. Recordings are authenticated and customer-scoped: `customer_location_preferences` stores the latest reported choice, server timestamp and coordinates rounded to two decimals only when allowed. Denied/skipped/unavailable replaces and clears any previous coordinates. RLS permits only the customer and ARS admins to read it. There is no continuous collection or location history, and existing payments, tickets and QR data are untouched. This is browser-reported discovery data, not verified attendance or proof of presence. No admin analytics view is added by this change.

If saving fails (including an unapplied migration), customers see an honest retry/continue-without-saving option. No claim of successful recording is made. The earlier manually opened discovery screen continues to use browser-session coordinates; this persistence change specifically concerns the post-login popup. No migration or tests were run.
