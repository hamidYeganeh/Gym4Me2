# Luma complete screen verification — 24 October 2026

Base: `821905d`. Scope: [complete screen pass](../product/luma-full-screen-pass.md).

Every one of the 112 product page exports now has an explicit view in the local-only `/qa/routes` canvas, rendering the same component and product props. All 112 were independently rendered in Persian/light at 390 × 844. The [render ledger](baselines/luma-full-screen-2026-10-24/render-evidence.json) records each capture, actual locale/theme, geometry, heading and screenshot digest. It distinguishes a route render from a successful command or complete state acceptance. QA routes remain gated and are excluded from the native export.

## Changes

- Bookings expose Upcoming/Past directly, group by Tehran calendar day, preserve cursor order and retain undated records. The two empty states explain what will appear there.
- Athlete chat has compact identity, date groups, message receipts and an anchored composer. Conversation details separate information and members. Host chat reserves the viewport for the conversation and composer; the mobile workspace dock no longer covers Send.
- Organization, branch, team, resource and service creation use focused sheets. Filters and destructive reviews retain their existing server commands, revisions and reasons. Support creation opens a focused form and routes to the created ticket after success.
- Authentication uses the focused entry pattern across athlete, business and admin surfaces. Club and coach details use inset covers; club actions remain explicit. Training panels guide hosts and administrators to their existing coaching and activity-report routes. Private plans, exercises and workout logs remain in the athlete/coach application; the management panels do not call its restricted endpoints.
- Sheets and mobile dialogs support grabber dismissal, keyboard focus restoration and overlay Back history. A controlled form that rejects dismissal while a command is pending now restores its owned history entry, so repeated Back stays in the form. Reduced-motion mode disables sheet and overlay animations as well as translation transitions.

## Local evidence

180 independently retained captures: 112 Persian/light route renders; 12 representative families at each of 360, 768 and 1440 pixels; those 12 in English/dark at 390 pixels; two additional training-panel views at desktop width and in English/dark; 15 additional empty/error/guest fixture cases; and the payment result with reduced motion. No retained record has a runtime exception, horizontal document overflow, unresolved loading indicator or broken image. Expected error notices remain in error/guest records. The `filled` fixture mode does not imply that every nested domain contains populated data.

All 112 phone views were visually reviewed in contact sheets. The additional responsive, dark and state captures were also reviewed. Contact sheets show the first viewport; full-page originals are retained locally. This is not a claim of separately exercising every below-fold control or every state in the route requirements.

Interactions exercised through CUA:

- Upcoming/Past booking switch, past completed booking and Tehran date heading.
- Session sheet with available, full/waitlist and resource-blocked sessions; grabber drag, Escape and browser Back; focus returns to Choose session.
- Resource creation with a synthetic eight-second pending command: Escape and repeated Back retain the sheet; a rejected request retains the draft and exposes a retryable error; Escape works after pending ends and restores the trigger.
- Nested discovery filters: Back closes only the option sheet, returns focus to its parent filter, and Escape then returns to the original filter trigger.
- Language selection in its sheet and light/dark appearance. Persian/light was restored afterward.
- Reduced-motion emulation: sheet/overlay computed animation and transition durations are `0s`; emulation was cleared afterward.

Local proof: `.artifacts/luma-final-pass/`, including `booking-past.png`, `session-sheet.png`, `pending-back-guard.png` and `resource-recoverable-error.png`. Synthetic fixture commands cannot mutate the live service. These checks do not establish real payment, SMS, physical camera, native keyboard or measured iOS spring physics.

250 application/shared-API regressions passed after the changes. UI/application TypeScript and ESLint, admin/business TypeScript, both locale checks, presentation copy, direct workspace dependencies and the 59-file protected-design guard passed. The two changed ClubDetail hashes were reviewed intentionally under the authorized redesign; the guard remains enabled.

## References and release

The 393 user-supplied September Luma stills are the primary visual source. [Route inventory](luma-route-inventory.json) maps authentication, agenda, discovery, registration, chat, account and operational adaptations to their actual reference families. Training and administration remain explicit sports/domain adaptations. The previously inspected [Mobbin registration flow](https://mobbin.com/flows/dc9085b2-fae1-48f7-a5be-ebafa1af2757) informs cover → focused registration → result behavior. The existing free 12ui branch was reused; no paid conversion, provider or credential was introduced.

## Published release

Implementation revision: `d3e236972a765be362b9b1db3c7bb42ab3b407bb`. [CI run 40067789069](https://github.com/hamidYeganeh/Gym4Me2/actions/runs/40067789069) completed successfully for verification and the iOS simulator build, including database regressions, all web/API builds, native export, Android build and native unit tests. The later release-record commit changes documentation only.

The same revision is READY on the existing [athlete application](https://gym4me-demo-application.vercel.app), [business](https://gym4me-demo-business.vercel.app), [admin](https://gym4me-demo-admin.vercel.app) and [API health](https://gym4me-demo-api.vercel.app/api/v1/system/health/ready) domains. Project IDs, deployment IDs, aliases, CI source and APK digests are recorded in the [release receipt](baselines/luma-full-screen-2026-10-24/release.json). All three frontend entry points returned HTTP 200. API readiness confirmed database and storage up; both fixed native CORS origins passed preflight.

The live synthetic-account smoke passed 69 requests across eight roles, including login, logout, account/access reads and role boundaries. Athlete/coach exercise reads succeed; business/admin exercise reads remain forbidden. No domain data was written. Mobile athlete entry, business login and admin login rendered without horizontal overflow or broken images. Focused OTP entry was also reviewed. Chrome emitted an asynchronous listener/message-channel diagnostic on two tabs; it is retained in the receipt, with no application exception screen visible. A deployment-scoped 15-minute error/fatal runtime-log query returned no groups for all four releases.

Android 1.3.0 / code 7 was downloaded from that exact CI run; the artifact archive digest matched GitHub. The bundled APK was aligned and signed with the existing local debug certificate, preserving update compatibility with the previous APK. V2/V3 verification and application ID/version checks passed. The stable API URL is bundled, there is no remote `server.url`, and QA routes are excluded. Delivery: `.artifacts/android/Gym4Me-1.3.0.apk` (23,171,009 bytes), SHA-256 `fc3063363cc1d1919d34d320d2aee0d924db0916b54ee9ed325dba120bb01359`. Physical-device acceptance remains untested.

No production catalogue or account reset was performed.
