# Operational analytics, controls and mobile geometry · 2026-10-22

Scope: the user's current request for role-appropriate administration/business/coach filters and analytics, phone layouts, settings, notification checks and a working free map. Baseline: `60f3ba6`. Existing cleared server data must remain cleared; no seed/bootstrap is part of this delivery.

## Implemented

- Independent analytics service with authenticated, consent-guarded admin/business/coach endpoints: `/api/v1/admin/analytics`, `/api/v1/business/analytics`, `/api/v1/profile/coach-analytics`.
- Administrator route `/analytics`; business `/reports`; coach's practice workspace has an Analytics tab. Dates apply explicitly; presets 7/30/90/365 days, daily/weekly/monthly buckets, organization/branch/service/type filters, accessible data table and CSV. A range is at most 730 days; daily buckets at most 93 inclusive days. Longer ranges use week/month. Empty count buckets are zero; no measurements are inferred.
- Counts: orders, reservations, attendance, sessions, cancelled/no-show reservations, non-cancelled capacity and confirmed/completed/no-show occupancy. Collections use verified payments and verification time; refunds use successful refunds and their settlement journal timestamp. Net collection is collections minus settled refunds, not recognized revenue or coach earnings.
- Global admin view includes new accounts/organizations/branches and whitelisted stored product-event counts. Events are not unique users or cohort conversion rates. No actor identifiers, health information or private messages are returned.
- Coach's unfiltered view additionally counts completed shared workouts, reviewed shared workouts and plan versions published to active collaborations. Ending collaboration or withdrawing workout sharing removes visibility. These private counts never enter admin/business analytics; a sports scope suppresses unrelated coaching counts.
- Business scopes are authorized in SQL using current membership, role and branch grants. Coaches see only current authorized service scopes. Unknown/foreign scope IDs fail, rather than widening the report. Parameterized queries, fixed interval enums and a repeatable-read, read-only snapshot protect report consistency. Money remains decimal strings/BigInt; CSV cells are quoted and formula-safe.
- Search/status/type/date/order/page controls run on the server before pagination for business services, members, order/payment lists and reception bookings. Admin exception queues and schedule service selection receive search/date/order/pagination; schedule also status/type. Existing reasoned, revision-aware commands retain their authorization. Refund exceptions are now visible in the admin panel.
- Coach session list has server search/status/date/order/page controls. Summary workspace reads omit its redundant full session list; that tab loads the requested page.
- Additive migration `0035_operational_analytics_indexes`: eight scope/date indexes. No reset, delete, seed or account creation.
- Token-free Leaflet 1.9.4/OpenStreetMap map with integrity-pinned lazy SDK, visible attribution, zoom, photo markers, selection/card navigation, loading/error/retry and optional user-triggered location. No bulk/prefetched/offline tiles. Native requests identify Gym4Me through the appended User-Agent. OpenStreetMap is best-effort, not a purchased SLA.
- Device notification settings distinguish in-app delivery, browser permission and unconfigured background push. Optional local notification display check has error/retry and a generic, non-private notification; it is not represented as server push. No permission is requested on page entry. Existing reminders/preferences/destination handling remains intact. Real Web Push/FCM/APNs provider delivery remains unconfigured.
- Five stable mobile destinations: home, discovery, training, conversations, account. Correct active-state matching, 44px targets, existing bottom safe spacing, smaller panel chrome, robust headings/form widths. Existing font, theme and 120/220/200ms motion remain. All 62 existing application route entries share reviewed shell families; see the linked source inventory below. This is not a claim that every authenticated role/state has been tested on a physical phone.

## References and implementation constraints

- Seline analytics hierarchy: https://mobbin.com/screens/31becc74-4060-407f-8102-4516d7cf38b6
- Vimeo explicit applied range: https://mobbin.com/screens/3de2cbeb-e6c0-42c4-a0c9-9123a6147b0c
- ClassPass map/results: https://mobbin.com/screens/77964b21-7ffe-4595-9fd6-bd1b19653e07 and https://mobbin.com/screens/04179b01-e490-4ffa-aa20-5fa9bb37726d
- Leaflet official setup: https://leafletjs.com/examples/quick-start/
- OSM tile requirements: https://operations.osmfoundation.org/policies/tiles/
- Notification permission constraints: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API

Visual QA follows Designly's visual-qa skill; references guide hierarchy, not copied artwork. Product Hunt lookup did not justify another dependency. Base44 tooling is for Base44 apps; this existing Next/Nest repository is retained and no builder credits or new infrastructure are used. The one map-component baseline hash change is intentional under the user's explicit authorization to change all components; all 59 guards remain enabled.

Existing source inventory: [mobile redesign](mobile-redesign-2026-10-22.md).

## Validation

Local: application/admin/business/API type checks, 62 API unit tests and 20 targeted analytics/navigation tests passed during development. Final lint/CI/browser matrix and deployment receipts are recorded below after completion.

Public data/accounts remain absent by user request; testing uses isolated browser fixtures and disposable CI PostgreSQL, never production seeding. Real phone acceptance, background push delivery, real payment/SMS and independent backups remain separate from this browser/technical verification.
