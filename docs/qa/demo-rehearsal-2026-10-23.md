# Demo rehearsal — 2026-10-23

Base revision: `45ffadf`. The user explicitly authorized restoring fictional role
accounts and catalog data, with natural presentation text, after the earlier
user-requested removal. These accounts never send live SMS or charge a bank card.

## Fixes found during rehearsal

- A reset installation retained its ready marker but had no accounts. Provisioning
  mistakenly took the existing-installation path and stopped with incomplete
  roles. Empty reset installations now follow full provisioning, while a
  nonempty incomplete installation is refused.
- Interrupted initial court publication/scheduling can resume without replacing
  later drafts, duplicating sessions or reviving cancelled sessions.
- Two different checkout operation IDs for the same user's active reservation
  caused a PostgreSQL uniqueness error and HTTP 500. The locked checkout now
  returns a translated 409 before creating another order. Existing quote
  validation and same-operation replay remain intact.
- Seeded accounts/catalog/programs use natural names and copy. Production
  preparation no longer imports the UI fixture's fixed-date opening exceptions
  or Sunday-only hours. Payment copy still states that no bank funds are debited.
- Android version is 1.1.1 / code 5, so the new APK can update the previous build.
- Direct membership QR visits now consume one credit under a membership lock.
  Replayed scans return the original visit; reserved credits are protected and
  two tokens cannot spend the last remaining credit concurrently.
- Secondary action buttons retain readable foreground colors on dark surfaces.
- Interrupted showcase preparation skips its already committed catalog and
  resumes initial unpublished programs without replacing later user edits.
- Scoped attendance analytics now includes direct membership QR visits as well
  as reservation attendance. Token replay contributes only one visit; the
  regression checks the Tehran day boundary and exclusion of the following day.

## Local verification

- All 78 commerce integration tests passed, including two new concurrent
  duplicate-checkout cases (held and paid reservations), quote changes, capacity,
  payments/refunds, resources, scheduling, private communications and analytics.
- An isolated PostgreSQL provisioning regression passed: reset state, eight role
  accounts, rerun without losing an edit, interrupted publication, PH4 plans,
  expanded catalog, presentation copy, and rejection of a partial installation.
- The real HTTP rehearsal passed 157 requests across eight account roles:
  discovery, sign-in, scoped dashboards, occurrence edit/replay/stale revision,
  failed/successful payment, repeated checkout/verification, membership QR
  attendance, cancellation/refund, personal/assigned training, replayed workout
  completion, progress, consent revocation, private messages, account export,
  dated analytics, Pro activation, coach settlements and logout/session rejection.
- API changed-file lint/types, locale parity/interpolation, copy guard, workspace
  dependencies and all 59 protected design files passed.

## Online and browser verification

- The full eight-account HTTP rehearsal passed all 157 requests on source
  `29f42ca`, including logout and rejection of the revoked sessions. Median API
  response was 291 ms, p95 384 ms and maximum 810 ms in that warm run. An earlier
  cold invocation took 8.2 seconds; the free service is not a latency guarantee.
- Thirteen read-only release checks passed: production pages, database/storage
  readiness, private endpoint rejection and both approved native origins.
- Native bearer sign-in, account/exercise/access reads and logout passed seven
  requests with a separate fictional coach account. Session credentials are
  kept only in memory and never included in receipts.
- Actual browser guest discovery/map, club/branch/hours, service detail, sign-in
  return path, price confirmation and paid membership receipt were verified.
- A coach-assigned workout retained four completed sets after an offline reload,
  then synchronized and remained completed after reconnect/reload. Its consenting
  athlete's workout appeared in the coach review queue and feedback was saved.
- Athlete profile/settings/notification preferences, coach/private collaboration,
  owner service creation/publication/scheduling, manager calendar, receptionist
  visit history and invalid-code recovery, accountant payments, business custom
  date reporting and admin dashboard/analytics rendered with restored data.
  Business calendar/report and nested scope filters fit 360 px without document
  overflow. UI confirmation showed one new class occurrence with capacity eight.
- The final 390 px paid receipt has no document overflow. Its secondary button
  computed foreground is `oklch(0.985 0 0)` over `oklch(0.205 0 0)`; the screenshot
  confirms readable text after the contrast correction.
- A browser network change interrupted an admin sign-in; retry recovered it.
  All three web API proxies subsequently returned healthy responses. Expected
  OTP cooldown rejection was observed when the browser and HTTP login overlapped;
  normal cooldown was respected. No rate limit was removed or weakened.

The earlier [UI acceptance](ux-polish-2026-10-23.md) covers thirty representative
screen families, English/light, Persian/dark, reduced motion and
360/390/768/1440 layouts. This rehearsal adds real stored-data flows; it does not
claim every route/role/theme/device permutation was manually retested.

## Accounts, data and release

See the [Persian meeting guide](meeting-guide-fa.md). With explicit approval,
the isolated online installation was restored to twelve fictional accounts,
eight organizations, twelve branches, forty-eight initially published services,
five coaches and ten programs. Rehearsal actions then add their own natural-name
orders/programs and one class. Existing data was not reset between checks.
One synthetic visit made before the QR fix was reconciled once with a guarded
ledger entry, so the prepared membership's balance matches its visit history.

CI source `29f42ca8466917592e32141848ba29df7f2e2fa4` completed successfully:
[run 39914940700](https://github.com/hamidYeganeh/Gym4Me2/actions/runs/39914940700).
It includes PostgreSQL acceptance through PH5, recovery, four production builds,
Android/native tests and the unsigned iOS simulator build.

The subsequent analytics-only correction is `cbc69d0`. Its live targeted check
confirmed exactly two recorded visits in both the platform total and the
membership service filter, matching PostgreSQL, then revoked the checking session.
Final CI/deployment confirmation is in the
[release receipt](baselines/demo-rehearsal-2026-10-23/release.json).
There are no mobile/frontend changes between those two sources.
[CI run 39965159362](https://github.com/hamidYeganeh/Gym4Me2/actions/runs/39965159362)
also completed successfully, including the expanded attendance regression,
all four production builds and both native build jobs. All four existing Vercel
projects are READY: API at `cbc69d0`, unchanged frontends at `29f42ca`.

Android output: `.artifacts/android/Gym4Me-1.1.1.apk`, package `com.gym4me.app`,
version 1.1.1 / code 5, minimum Android 7 (API 24), target 36, 23,162,817 bytes.
The successful CI archive digest was checked, ZIP integrity passed, and the APK
was re-signed using the same local debug certificate as the previous delivery.
Both v2 and v3 signatures verify. Stable HTTPS API assets are bundled; there is
no remote `server.url` override. APK SHA-256:
`469a21557be8fc212ea8c906dfeebdadfe2ad118c03e7076ffe756ef9e5f3884`.

[Sanitized receipts and screenshots](baselines/demo-rehearsal-2026-10-23/)
contain no session cookies, provider keys or private environment files.

Physical-device behavior, real SMS/payments and native FCM/APNs are not accepted
by these automated/build checks. Video remains deferred. Real bank funds are
never charged by the configured payment adapter. No finite test pass can promise
that no bug will ever occur during the meeting.
