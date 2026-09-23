# ARS final authenticated E2E QA - 2026-09-14

## Assessment

**Not cleared for production entrance use by this pass.** Authenticated read views, selected filters, invalid QR handling and sampled authorization boundaries passed. Positive owned-ticket display, successful/duplicate admission, concurrency and physical-device scanning remain unverified.

Target: `http://localhost:3000`, local development server and its configured Supabase project. Tests used the Codex in-app browser, independent authenticated HTTP sessions, and Supabase REST with the public anon key plus test-user JWTs. No service-role bypass was used for RLS probes. Observations were collected on 14 September 2026, around 20:55-21:15 IST. Event status is time-dependent.

No application code, authentication implementation, RLS or tests were changed. No live payments, marketing messages or real guest check-ins were performed. Logins and invalid scan attempts can create audit records. Credentials and tokens are omitted from this report.

PASS means the specific steps below passed, not every action on that page. SSR means authenticated HTTP response inspection, not interactive browser verification. BLOCKED includes incomplete verification; an HTTP 200 shell alone is not a complete page pass.

## 1. Verified and blocked flow matrix

### Customer

The user manually completed Google sign-in. The browser subsequently displayed Monika Sharma as the signed-in customer. No customer OTP or password authentication was used or introduced.

| Flow | Result | Steps and evidence |
| --- | --- | --- |
| Google-authenticated session | PASS | After manual Google sign-in, opened `/account/tickets`; observed Monika Sharma, verified membership and the signed-in email. |
| Customer Account | PASS | Opened `/account/profile`; verified email, edit name/discovery action, consent link, My Pass link and Sign out appeared. Mobile linking was not required to read the account. |
| Events | PASS | Opened `/events`; real event cards, prices and availability appeared. Not every discovery filter combination was exercised. |
| Event details | PASS | Followed Saturday Techno Rave to `/events/a85e0906-715f-4c98-9de3-5038346ad5f8`; Early/Regular/Premium tiers at INR 1499/1999/2499, perks, dates, quantity and availability appeared. No payment was submitted. |
| My Pass empty state | PASS | `/account/tickets` showed zero upcoming guest passes and a clear empty collection. |
| Ticket ownership denial | PASS | Opened `/ticket/4ba0ee16-fb60-42c4-8ab9-8b9e6c6678d9` under the customer session. An authorized data check established this existing ticket belongs to another account. UI returned `Access denied` / `Your account does not have permission to access this resource.` No QR was exposed. |
| Cross-role protected routes | PASS | Customer directly opened `/admin`, `/owner`, `/staff/scanner`; all displayed Access denied. |
| Owned digital ticket / QR | BLOCKED | No upcoming owned test pass or designated disposable ticket was available. Positive QR rendering was not established. |
| Completed booking | BLOCKED | Tier display was checked, but test-only order creation, payment confirmation and pass delivery were not exercised. Live payments were prohibited. |

### Admin

Used the supplied dedicated Admin credentials at `/admin/login`. Independent API login also returned HTTP 200 success.

| Flow | Result | Steps and evidence |
| --- | --- | --- |
| Login | PASS | Entered credentials and clicked Sign in; dashboard loaded. |
| Dashboard | PASS | `/admin` rendered KPIs and paid-test-order disclaimer. Observed INR 47,623.20 revenue and 29 tickets; no independent financial reconciliation. |
| Venues | PASS | `/admin/venues` rendered XTREME, MIAMI and club roso. Opened first Edit dialog, then Cancel; dialog closed without saving. |
| Venue Performance | PASS with availability finding | `/admin/performance/381a05bd-1c89-4536-927d-9ad7a1efaa46?days=7` eventually loaded after a navigation timeout. Clicked 30 days and 90 days and confirmed selected/pressed state changed. |
| Compare Venues | BLOCKED | `/admin/compare` returned authenticated SSR comparison headings, but browser navigation timed out. Interactive completion not established. |
| Events | PASS | `/admin/events` defaulted to Live with one matching event. Clicking Upcoming changed selected state and matching list. No create/edit action submitted. |
| Tickets & Orders | PASS, read view | `/admin/tickets` rendered table, filters, test labels and pagination controls. Export and all pagination pages were not exercised. |
| Promoters | PASS, read view | `/admin/promoters` settled retry displayed 3 active promoters, referral codes and performance data. Initial unavailable values were a loading snapshot, not a confirmed persistent failure. No edits/payouts. |
| Customers / CRM | PASS | `/admin/customers` showed 6 registered versus 3 purchasing customers with cohort explanations. Opened `yash` Customer 360; venue, purchase and attendance history appeared; closed it. CSV contents were not reconciled. |
| Coupons | BLOCKED | `/admin/coupons` rendered Discount coupons heading and creation form; settled coupon data and redemption were not established. No coupon created. |
| Settlements | PASS, read view | Retried `/admin/settlements` after connection refusal; totals, estimates, history, filters and statement controls loaded. No financial action. |
| Marketing | PASS, read view with F-02 | `/admin/marketing` rendered six audience accounts, zero WhatsApp opt-ins, filters, campaign form and performance table. Explicitly draft-only with no sending provider connected. No draft saved/message sent. |
| Replaced session rejection | PASS | After browser Admin login, the earlier Admin HTTP session returned 401 `SESSION_REPLACED`: `This session ended because you signed in elsewhere or signed out. Please sign in again.` Sampled endpoint only, not every stale screen. |

### Owner

Used supplied Owner credentials at `/owner/login`. Browser showed the assigned account and XTREME. SSR checks used the Owner's actual authenticated cookie.

| Flow | Result | Steps and evidence |
| --- | --- | --- |
| Login | PASS | Submitted Enter owner portal; authenticated dashboard rendered. |
| Dashboard | PASS | `/owner` rendered XTREME revenue, tickets, attendance, events, settlement summary and charts. |
| Live Operations | PASS, read view | Dashboard showed Tonight at XTREME, 11 sold/11 checked-in passes, gate performance and Refresh. Occupancy said Not tracked, not current attendance. No new admission generated to test refresh. |
| Events | PASS | Followed Events; two venue events appeared. Clicked Live; one live event remained and Live was pressed. |
| Tickets | PASS, SSR only | GET `/owner/tickets` returned 200 with filter/ticket view and 12 tickets. Browser controls/export unverified. |
| Customers | PASS, SSR only | GET `/owner/customers` returned 200 with Customer 360 and purchase/attendance sections. |
| Promoters | PASS, SSR only | GET `/owner/promoters` returned 200 with performance, attribution and referral sections. Create/assign/edit not exercised. |
| Analytics | PASS, SSR only | GET `/owner/analytics` returned 200 with event, tier, customer and promoter reports. Interactive filters unverified. |
| Settlements | PASS, SSR only | GET `/owner/settlements` returned 200 with policy, transactions, history and statement sections. No payout action. |
| Staff | PASS, SSR only | GET `/owner/staff` returned 200 with invitations, assignments and scan/audit sections. No permissions changed. |
| Guest list | PASS, SSR only | GET `/owner/guests` returned 200 with guest-list view. |
| Login Activity | PASS, SSR only | GET `/owner/login-activity` returned 200. Audit row completeness/device attribution not reconciled. |
| Venue isolation | PASS, sampled negative API/RLS | Known unassigned venue request returned 403 Venue access denied; direct RLS hid its venue row. Populated foreign ticket isolation remains blocked. |

### Staff

| Flow | Result | Steps and evidence |
| --- | --- | --- |
| Login / portal | PASS | Signed in at `/staff/login`; `/staff/scanner` rendered club roso terminal. Independent login API returned 200. |
| Venue/gate | PASS | Assignment dropdown offered only `club roso · Main Entrance`, not unassigned XTREME. |
| Invalid QR API | PASS | POST `/api/staff/scan` with `qrToken: ARS-QA-INVALID-NOT-A-TICKET-20260914` and assignment `6a9cc0ad-7968-4307-bbde-16b746230eaf`: 400, `success:false`, `result:INVALID`, `message:Ticket not found.` |
| Invalid QR browser | PASS | Entered same dummy token and clicked Verify pass. UI showed `INVALID TICKET` / `Ticket not found or invalid format.` Input cleared; admitted count stayed 0. |
| Unauthorized assignment | PASS | Dummy token plus nonexistent assignment returned 403 `Scanner assignment access denied`. |
| Inactive venue assignment | PASS | Dummy token with assignment `529c2541-8aa9-48e0-8fbb-b64a7ee8c443` for inactive venue returned same 403. |
| Camera start/stop | PASS, UI lifecycle only | Start camera initially remained Opening camera, then reached `Camera ready / present the next QR`. Stop camera returned to idle Start camera view. Physical image quality/QR recognition not verified. |
| Valid QR / approved | BLOCKED | No disposable event/pass designated; no existing guest pass checked in. |
| Duplicate QR | BLOCKED | No authorized disposable used/test pass submitted. |
| Continuous / concurrent scanning | BLOCKED | No physical-device and disposable-pass setup. Atomic duplicate prevention and repeated camera recognition not established. |
| Successful scan audit | BLOCKED | Did not create/reconcile successful scan rows linking ticket/event/venue/staff/timestamp. Invalid attempts only. |

## 2. Security evidence and limits

| Probe | Result | Evidence |
| --- | --- | --- |
| Customer cross-role / foreign ticket | PASS | Browser Access denied on three protected role routes and an existing foreign ticket. |
| Staff to Owner APIs | PASS | GET `/api/owner/events` and `/api/owner/promoters` returned 403 `This account cannot access this area`. |
| Owner/Staff to Admin API | PASS | POST `/api/admin/venue-photo` with empty JSON returned 403 for both roles. No upload. |
| Owner unassigned venue | PASS | GET `/api/owner/events?venueId=26ba1454-730f-40ee-87df-bf5cd44e08a6` returned 403 `Venue access denied`. |
| Owner venue RLS | PASS | Public anon key plus Owner JWT queried known unassigned venue IDs; returned 200 empty arrays. Existence independently established through authorized Admin access. |
| Staff financial/marketing RLS | PASS, sampled reads | Staff JWT reads of `orders`, `settlements`, `sources`, `marketing_campaigns` returned empty arrays. Not an exhaustive policy or write test. |
| Staff assignment RLS | PASS | Staff JWT query for unassigned XTREME assignments returned empty array. |
| Admin second-session rejection | PASS | Old session returned 401 SESSION_REPLACED after second login. |
| Populated foreign orders/tickets | BLOCKED | Known unassigned venues had no events in authorized query; empty data cannot prove populated foreign ticket/order isolation. |
| Full RLS/RBAC coverage | BLOCKED | Every SELECT/INSERT/UPDATE/DELETE policy, RPC and endpoint was not audited. Sampled negatives do not certify all access boundaries. |

## 3. Responsiveness, loading and empty states

| Check | Result | Observation |
| --- | --- | --- |
| Customer Account / detail narrow width | PASS, measurement only | Earlier narrow samples measured about 300 CSS px viewport and 291 px document width, with no document-level horizontal overflow. Not a physical-device test. |
| Admin dashboard / CRM narrow width | PASS, measurement only | Same narrow samples had no document-level overflow. All dialogs/table touch interactions not tested. |
| Owner Events | PASS | Explicit 390x844 viewport: document width 381, viewport 390. Mobile bottom navigation and Live filter worked. |
| Staff scanner | PASS | At 390px viewport, document width 381; assignment, token entry and result available. |
| Empty states | PASS | Customer zero-pass state; Owner no recent scanner activity and empty gate table clearly labelled. |
| Loading | PASS with F-03 | Loading your view usually resolved. Slow/refused routes separately recorded below. |
| Offline/database outage recovery | BLOCKED | No outage was injected; invalid input/authorization errors are not equivalent to offline recovery testing. |

Viewport override was reset and the camera explicitly stopped. Terminal lock was attempted; logout completion is not claimed without an observed login screen.

## 4. Failed findings

### F-01 - P2: Customer login copy contradicts Google-only requirement

- Page: customer sign-in reached from a protected customer route.
- Steps: open sign-in without a customer session; read introduction.
- Actual: `Sign in or join with a mobile verification code. No password needed.`
- Expected: describe configured Google-only customer authentication.
- Impact: misleading login instructions.
- Recommended fix: align copy with enabled methods without changing authentication implementation.
- Limit: wording mismatch verified; this does not establish that an OTP backend is enabled.

### F-02 - P2: Unnamed Customer 360 button for incomplete profile

- Page: `/admin/marketing`.
- Steps: Admin opens Marketing with default All audience; inspect account row lacking a saved name (email remains visible).
- Actual: Customer 360 action is an empty button with no accessible name. Other rows have named buttons.
- Expected: visible and accessible fallback label on every profile action.
- Impact: profile discovery and screen-reader operation impaired for incomplete accounts.
- Recommended fix: use email or `Unnamed customer` fallback and explicit accessible label; retain account ID as lookup key.
- Limit: unnamed button verified in DOM; its empty target was not clicked.

### F-03 - P2 investigation: intermittent local navigation availability

- Pages: `/admin/performance/381a05bd-1c89-4536-927d-9ad7a1efaa46?days=7`, `/admin/compare`, `/admin/settlements`, `/admin/marketing`. One `/api/owner/events` request also exceeded a 20-second probe deadline.
- Steps: authenticate and navigate to reporting pages during the local development run.
- Actual: Performance navigation timed out before eventually rendering; Compare timed out without interactive completion. Settlements/Marketing initially returned `ERR_CONNECTION_REFUSED`. Subsequent HTTP probe returned 200 with Node listening on 3000; new browser navigation loaded both pages.
- Expected: bounded, recoverable loading and stable route availability.
- Recommended investigation: correlate dev-server and Supabase timings, repeat on a production-build test deployment, then investigate queries/error boundaries based on evidence.
- Classification: observed local availability failure, not a proven persistent production defect. No server restart or application patch was made by this QA pass.

No confirmed P1 authorization leak was observed in the sampled tests. This is not an exhaustive security certification.

## 5. Remaining blocked / still unverified

- Owned customer QR/digital pass and group-pass navigation for the Google test account.
- Test-only completed checkout, payment webhook/order/pass reconciliation; no live payments attempted.
- Successful/duplicate/concurrent admissions, retry idempotency and atomic admission on disposable passes.
- Physical Android/iPhone camera speed, continuous scanning after results, permission denial/regrant and network interruption.
- Successful audit-row completeness and Live Operations refresh following admission.
- Populated foreign ticket/order fixtures and all write/RPC authorization boundaries.
- Interactive Compare Venues and settled coupon validation/redemption.
- Owner SSR-only page controls, dialogs, downloads and pagination.
- CSV data/count reconciliation; registration and purchase counts are labelled differently, but exports were not compared here.
- Full visual/device/accessibility matrix, every link/button and every error state.
- Promoter/coupon/event changes, audience/draft persistence and settlement changes; no business records mutated.
- Marketing delivery/provider callbacks: sending providers are explicitly not connected. UI also says campaign purchase attribution is not tracked.
- Systematic API/database outage injection, expiry/session recovery and logout completion.

## 6. Validation context

This was runtime authenticated QA, not a new build/typecheck run. The preceding validation pass reported website typecheck, scanner typecheck, 113 tests across 10 files, and production build passing. Those results were **not rerun or independently reconfirmed here** and do not substitute for the blocked transactional/device flows. No tests were removed or skipped to obtain a pass.

## 7. Next steps before production sign-off

1. Designate a disposable event and unused/used test passes owned by the dedicated customer and assigned to the test Staff gate.
2. Complete successful, duplicate, concurrent and offline/retry scans on physical devices; reconcile audit rows.
3. Complete populated cross-venue ticket/order and owned QR tests without altering RLS.
4. Fix the two UI findings, investigate navigation instability and repeat Compare/Coupons on a stable production-build test deployment.
5. Complete remaining interactive/export/mobile checks before unconditional release approval.
