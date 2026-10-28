# Cloud continuation: production reservations and coaching

Continue on branch codex/production-discovery-business-20261028 in hamidYeganeh/Gym4Me2. The user explicitly requested pushing/deploying completed work, an Android APK/report, and continuing remaining acceptance work as a Cloud task. Read AGENTS.md and the gym4me-deploy skill for production work.

## Production state already created through pages

Four explicitly named QA organizations were created through the business panel and reviewed through admin:
- Session entry: 89cbc75b-eb68-4e8c-850e-4f52f97be09d; main branch a31a6b4b-e38c-4828-a76b-1fb295d6a3af.
- Membership/group classes: 779b00db-3364-469f-beca-adf4fe807803.
- Court/exclusive timeslots: 46f868ae-0738-451f-8355-b460c217e2eb.
- Private coaching: ebec7582-98a4-4ec0-b045-7512dbd448a2.

All names begin with آزمایشی جیم‌فورمی. Only session-entry club has completed introduction, cover, labeled test contact numbers, Iran/Tehran/Islamshahr location, manual/map coordinates, sport/equipment and a Saturday 06:00–23:00 weekly interval. It is approved but still pending_review, NOT published. Other three clubs remain drafts. Preserve the pre-existing real club.

Admin catalog initialization through its button added 89 resources; a second click added zero. Owner's account was explicitly authorized for admin access. A second SMS-verified account completed consent itself and activated coach mode. Its public coach ID is coach-660f812502fa48aab5c587830d9d399b, review approved until 2026-11-27. The QA credential explicitly says it has no educational/professional value. Do not describe this account as a real certified professional.

At handoff there are ZERO sport_services, ZERO sport_orders and ZERO coaching_relationships. No reservation scenario or two-party coach/student scenario has yet passed. Do not treat setup as completed acceptance.

## Required remaining work

1. Complete the three remaining clubs through their pages, publish explicitly marked test clubs after normal readiness/review, and create varied services: session entry, membership entitlements, group classes, exclusive court slots, private/semi-private coaching. Use free services or explicit sandbox-only payment paths. No real bank transactions, fabricated cash collections against real customers, or notifications to unrelated users.
2. Run actual UI flows on production for reservation creation, duplicate submission, last-seat capacity, invalid/expired sessions, customer/host cancellation, approval/rejection, rescheduling conflicts, waitlist, membership usage/restoration and attendance/no-show where the UI and timing permit. Record exact scenarios, identifiers and screenshots outside the project. Do not force database states or backdate production rows to simulate a pass.
3. Exercise coach invitation/request, recipient acceptance/decline, duplicate requests, ending cooperation, unauthorized/private record access and revoked collaboration. Use only accounts controlled by the user. Authentication/OTP must be normal; no minted sessions or disabled auth. Ask for required credentials/OTP in the Cloud chat; local browser sessions/SSH credentials are not transferred.
4. Re-test the fixed Enter behavior in a real browser, and check whether new coaches have a discoverable activation entry from /more; direct /coaching navigation was needed in the earlier run.
5. Verify native club class list/detail navigation uses query-based exported routes and keeps the class list scoped to the club. The APK was built but not launched locally.
6. Inspect adb/emulator/AVDs in the Cloud environment. If an AVD exists, start it if needed, wait for boot, build/install/launch Debug, walk main scenarios with screenshots at each step, inspect Logcat, fix/rebuild/retest, test update over an older install for retained data, then close it. If no AVD exists, report that and DO NOT install/create one. A real phone is not tested unless actually used.
7. Use isolated test databases for destructive/race tests that cannot be responsibly exercised through production UI. Label those results separately from production acceptance. Never reset/reseed production, delete volumes or bypass authentication.
8. Keep temporary test scripts and screenshots OUTSIDE the project and do not commit them. Existing maintained feature tests may be run. Fix code, run relevant checks, and follow staged VPS deployment only if deployment access is available. Never transfer local secrets into Cloud implicitly.

## Completed checks and fixes

- Production HTTPS/static assets/readiness and private proxy rejection checks.
- UI required-name validation, Back/Next draft retention, four club creations, labeled multi-phone save/reload including Persian extension normalization, club cover, branch map click/manual coordinate save, coach sign-up/profile/credential review. Approving a coach without a valid credential was rejected as expected.
- Enter from an overlay/combobox is no longer intercepted by the underlying multistep form.
- Native export excludes the dynamic web-only /club route.
- Native club class links use exported service query routes; native class listing carries organizationId.

## Reporting

Produce an honest Persian report listing exactly what ran, failures and fixes, blockers and untested cases. No blanket "all states pass". Local machine had adb but no emulator binary, no AVD and no connected device. It installed no emulator; Android runtime, Logcat and update retention were NOT tested locally. APK assembly and JVM/unit checks alone are not Android runtime verification.
