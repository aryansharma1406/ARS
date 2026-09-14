# Owner/Admin single-session access

## Deployment required

Apply `supabase/migrations/202609140001_portal_sessions.sql` to the connected Supabase project and deploy the matching application changes together, preferably in a maintenance window. The migration has not been applied by this task. A working server-only `SUPABASE_SERVICE_ROLE_KEY` is required for registration after verified password login. Never expose this key to the browser.

Existing Owner/Admin sessions will no longer pass business authorization until they sign in again. Customer and Staff roles are not subject to this session gate. One account can still manage multiple assigned venues. Multiple tabs sharing the same browser session count as one login.

## Behavior

A successful portal password login atomically takes the account's active session slot and records the replaced session. The session ID comes from Supabase's verified sign-in response and is matched against `auth.sessions`. Registration is service-role-only; old sessions cannot register themselves again. Concurrent registrations are serialized per account and older sessions cannot displace newer ones.

Protected application requests check the slot. Existing database business RLS/RPC role helpers also reject superseded business sessions, including unexpired old JWTs. Business roles are returned as `session_revoked` for those sessions. Payment, ticket, commission and settlement functions are not rewritten.

An open portal checks every 15 seconds while visible and on focus. A replaced device is taken to its login page and its local Supabase session is signed out. Already rendered content is not remotely erased immediately; authorization takes effect on subsequent protected requests. Requests already in progress may finish. Network failures block the portal UI until session verification is available again. No device fingerprint or continuous location tracking is used.

History: `/admin/login-activity` shows Owner/Admin accounts; `/owner/login-activity` shows only that owner account across its venues. Records include successful login time, account name/email snapshot, approximate browser/device, last seen, replacement/sign-out status and end time. No retroactive records or failed-password attempt logging. Active is not proof of online presence. Historical rows are not client-writable and session identifiers are not returned by the history RPC.

## Validation still required

No build, tests or two-device validation were run. Before production rollout, verify two-device replacement for owner/admin/super-admin, concurrent logins, old-session API and direct Supabase RPC/RLS denial, history isolation, replacement followed by old-device logout, customer/staff regression, refresh and explicit logout. Verify deployment against the project's actual Supabase Auth schema. No global Supabase single-session setting was changed.
