# Customer authentication

The customer navbar contains Events, Venues, My Pass, and Account. My Pass and Account use `/account/tickets`; the existing authentication guard redirects signed-out customers to `/login?next=...`. Owner, staff, and admin routes and permissions are unchanged.

## Google setup required

The connected Supabase project currently reports Google as disabled. The UI displays a configuration message while email login remains available.

1. Create a Google OAuth web client and configure its consent screen. Add your Supabase project's `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google.
2. In Supabase Authentication → Sign In / Providers → Google, enable Google and enter that web client's ID and secret. Keep the secret in Supabase, never in client code.
3. Set the Supabase Site URL and `NEXT_PUBLIC_APP_URL` to the application origin. Locally this is `http://localhost:3000`.
4. Add `http://localhost:3000/auth/customer/callback**` to Supabase's redirect allowlist for development, and the corresponding HTTPS application callback for production. The trailing wildcard permits the `next` and `flow` query parameters. Scope patterns to this callback path; avoid a broad production wildcard.
5. If Google's consent app is in testing mode, add the Google accounts used for acceptance testing as test users.

Reference: [Supabase Google sign-in documentation](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Flow

`POST /api/auth/google` applies the existing origin check, reads the actual provider status, and calls the existing Supabase server client's `signInWithOAuth`. The SSR client manages the PKCE verifier in the existing HttpOnly cookie setup. `/auth/customer/callback` exchanges the authorization code, validates the active customer role, and redirects to an allowed customer destination. Noncustomer accounts are signed out of that local session and shown a customer-access error. No roles are assigned or changed by these routes.

## Password recovery

The customer form uses `resetPasswordForEmail`, a PKCE callback, and `updateUser` through Supabase. The reset form and update endpoint require the existing active-customer check. Passwords follow the existing 12–256 character rule plus Supabase's configured password policy. Open reset emails in the same browser that requested them. Configure Supabase SMTP and keep the password-recovery email template linked to `{{ .ConfirmationURL }}` so Supabase verifies the token and redirects to the supplied callback. The existing signup confirmation route is unchanged.

Reference: [Supabase password recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Validation

Automated coverage includes provider-disabled handling, origin rejection, invalid PKCE exchange, provider cancellation, return URL restrictions, customer-role enforcement, recovery, and password validation. Browser review confirms the disabled-provider message, password visibility, mode switching, mobile navigation, and signed-out My Pass redirect. Full Google consent and real recovery-email completion require configured providers/SMTP and authorized accounts; no real emails or password changes were sent during verification.

## Files in this change

- `components/Navbar.tsx`
- `components/auth/CustomerAuthForm.tsx` (new, customer-only; the shared staff/admin form is unchanged)
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/reset-password/page.tsx` (new)
- `app/api/auth/google/route.ts` (new)
- `app/auth/customer/callback/route.ts` (new)
- `app/api/auth/forgot-password/route.ts` (new)
- `app/api/auth/reset-password/route.ts` (new)
- `lib/customer-auth.ts` (new)
- `tests/customer-auth.test.ts` (new)
- `docs/CUSTOMER-AUTH.md` (new)

## Canonical sign-in origin

Customer login, signup, and password-reset forms now check the browser origin against `NEXT_PUBLIC_APP_URL` before accepting input. An alternate preview port or loopback hostname automatically navigates to the configured application origin, preserving the route and return query. This avoids the “Request origin denied” failure and keeps PKCE/session cookies on one origin. The server-side `checkOrigin` policy is unchanged.

Regression validation: 117 tests pass; typecheck, lint, and production build pass. The browser verified correction from `127.0.0.1:3000` to `localhost:3000`; the Google request then reached provider configuration validation instead of origin rejection. The additional implementation and regression files are `lib/customer-auth-origin.ts` and `tests/customer-auth-origin.test.ts`.
