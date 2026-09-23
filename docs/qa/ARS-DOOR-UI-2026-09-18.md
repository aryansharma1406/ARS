# ARS Door scanner UI upgrade - 18 September 2026

## Scope

Presentation-only scanner upgrade. Authentication, RPC implementation, SQL migrations, RLS, authorization, request IDs, persisted pending scans, scan suppression, cooldown and ticket mutation rules were not changed.

## Implemented

- Camera-first layout with a larger adaptive frame and concise instruction.
- Compact ARS DOOR header, venue/gate, staff identity and secondary settings panel.
- Fresh approvals show guest, event, pass type, pass ID and check-in time, then dismiss after 3.5 seconds. This only hides the result card; it does not reset or submit a scan.
- Duplicate and invalid results remain readable until dismissed or replaced by the next scan. Invalid results retain the server reason.
- Replayed receipts are labelled RECOVERED RESULT, never presented as a new approval, and are not automatically dismissed.
- Success/warning/error haptics, with an in-session settings toggle. No sound dependency or audio permission was added.
- Clean NO EVENT TONIGHT state; stale/unavailable metrics are not presented as current figures.
- Compact, minimum 48-point Torch, Pause/Resume and Enter QR controls.
- ARS connection indicator based on existing operational requests. This is server reachability, not OS-level connectivity monitoring; no offline approval is implied.
- Scrollable result/operations area and keyboard-aware manual entry.

## Existing backend limitations preserved

The current group booking viewer presents an individual QR for each guest. The mobile scan RPC returns one ticket, with no group membership/counts or bulk check-in endpoint. Therefore no GROUP PASS counts, CHECK IN ALL or SELECT GUESTS actions were fabricated. Settings explain the existing one-QR-per-guest workflow.

No authoritative scans-tonight counter is returned by the mobile stats RPC. The existing checked-in total is shown without relabelling it as scans performed tonight.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Scanner typecheck | PASS | `npm run typecheck:scanner`; initial backdrop typing error corrected with explicit absolute positioning |
| Selected tests | PASS | 70 tests across scanner-presentation, authorization, database and current-schema test files |
| Isolated mobile RPC checks | PASS | Disposable PGlite database: fresh approval, identical-request replay, distinct-request duplicate, invalid token, two ticket scan records and three request receipts |
| Android debug build | PASS | `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a`; Gradle BUILD SUCCESSFUL |
| Install on physical Android | BLOCKED | Device CPH2781 / `6P9HOVMFXKQ4OBP7` detected initially, disconnected before installation; Expo and adb install reported no device |
| Physical camera and responsive layout | UNVERIFIED | No post-upgrade device screenshot or camera scan available |
| Real Supabase test fixture | BLOCKED | Service client denied SELECT on `venue_staff_assignments` with code 42501; setup stopped before any test records were created |
| Physical valid/duplicate/invalid scans | BLOCKED | No connected device or deployed disposable fixture |
| Two-device/concurrent scans | UNVERIFIED | Isolated checks were sequential and are not evidence of concurrent-device behavior |
| Owner Live Operations updates | UNVERIFIED | No deployed test check-in performed |

## Test identity and data safety

The supplied email was verified as an active Staff account, not a customer. Its role was not changed. The user approved creating a separate TEST customer, but fixture setup stopped at the permission check before creating one.

The active target venue is `club roso ` (trailing space), ID `9a847919-c4b8-43bd-87a8-85f215194d72`. The website and mobile app use the same Supabase URL. Neither the venue record nor its assignments were altered.

No real guest pass was scanned or changed, no live payment was made, and no database grants or security policies were changed.

## Remaining work

Reconnect and unlock the Android phone. Install the debug APK and inspect the camera, settings, manual entry, empty state and result cards on-device. Provision a disposable TEST customer/event/pass through an appropriately authorized setup path without widening grants, then exercise approval, duplicate, concurrent scans, audit records and Owner Live Operations.

This is a development APK, not a standalone release. Its JavaScript is served by Metro; successful native assembly alone does not prove that the updated JavaScript works on a physical device. Do not treat this pass as production sign-off.

## Follow-up: Android installation and UX refinements

This section supersedes earlier installation-blocked status for the latest debug build.

### Implemented
- Larger, clearer scan frame with reduced header and operations decoration.
- Compact ARS DOOR, venue/gate/staff and network status header.
- FLASH, PAUSE and ENTER QR secondary controls.
- Native connectivity contributes to ONLINE/OFFLINE presentation; no offline approval path was added.
- Optional bundled result sounds, disabled by default, alongside existing haptic feedback. Audio recording/background playback are disabled in plugin configuration.
- Existing per-guest group-booking model retained. The scan response has no group counts or bulk admission contract; none were fabricated.
- No authentication, scan RPC, authorization, idempotency, database schema or backend behavior changes.

### Validation results
- PASS: scanner TypeScript check (`npm run typecheck:scanner`).
- PASS: 71 tests across scanner-presentation, authorization, database and current-schema test files.
- PASS: Android arm64 debug build (`:app:assembleDebug`).
- PASS: APK update installed on connected CPH2781 after user approval. Android verification protections were not disabled.
- PASS: app launches and restores existing assigned staff context for club roso / Main Entrance; ONLINE displayed.
- PASS: physical-device visual inspection of enlarged frame, compact header, controls and NO EVENT TONIGHT state.
- PASS: pause displays SCANNER PAUSED and RESUME.
- PASS: settings panel renders staff context, haptic and sound switches, group-booking guidance and secondary sign-out.
- PASS: manual token panel opens; empty VERIFY PASS is disabled. No guest token submitted.
- PASS: app reopens after leaving it and returns to scanner with ONLINE status. This is a basic lifecycle check, not a sustained background/resource stress test.

### Remaining unverified / limitations
- Physical valid, duplicate and invalid QR result flows, concurrent-device checks and resulting remote audit records were not exercised in this follow-up. No real guest pass was checked in.
- Offline transition/recovery and pending-request retry were not exercised on the physical device; network label logic is unit-tested.
- Sound audibility, haptic sensation, flash hardware, sustained camera decoding and rapid repeated scans require hands-on device testing with disposable passes.
- Preview was dark during screenshots; this does not establish camera decoding reliability.
- Earlier disposable-fixture setup was blocked by database permissions; no security relaxation was applied.
- Hardware Back during panel testing led to the home screen; panel dismissal versus development-client lifecycle behavior was not isolated. Explicit close and repeated Back behavior still need confirmation.
- Development build requires Metro and is not a standalone production release. Expo development tools overlay remains visible.
- Dependency installation reported 10 moderate audit findings; unrelated dependency upgrades were not attempted.

Assessment: updated build is installed and available for hands-on testing. Do not treat the visual and automated checks as production entrance certification.
