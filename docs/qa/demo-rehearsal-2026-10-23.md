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

## Local verification

- All 75 commerce integration tests passed, including two new concurrent
  duplicate-checkout cases (held and paid reservations), quote changes, capacity,
  payments/refunds, resources, scheduling, private communications and analytics.
- An isolated PostgreSQL provisioning regression passed: reset state, eight role
  accounts, rerun without losing an edit, interrupted publication, PH4 plans,
  expanded catalog, presentation copy, and rejection of a partial installation.
- The real HTTP rehearsal passed 156 requests across eight account roles:
  discovery, sign-in, scoped dashboards, occurrence edit/replay/stale revision,
  failed/successful payment, repeated checkout/verification, membership QR
  attendance, cancellation/refund, personal/assigned training, replayed workout
  completion, progress, consent revocation, private messages, account export,
  dated analytics, Pro activation, coach settlements and logout/session rejection.
- API changed-file lint/types, locale parity/interpolation, copy guard, workspace
  dependencies and all 59 protected design files passed.

Online browser acceptance, CI and final artifact/deployment receipts are added
after verification. Local receipts are under `.artifacts/demo-rehearsal-2026-10-23/`;
session credentials are kept only in memory and are not part of the receipts.
