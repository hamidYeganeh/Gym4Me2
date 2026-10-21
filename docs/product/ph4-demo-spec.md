# PH0–PH4 free demo acceptance contract

Baseline: `3ff11c5`. User approved personal and coach-authored programs, persistent data, free existing Vercel/Neon infrastructure, original visual language and 120/220/200 ms motion. Real video upload/processing/playback is explicitly deferred; the capability remains false. Synthetic money, SMS, push, pilot and operational drills must be labelled as simulations, not real launch acceptance.

## Product flows

1. Athlete: Training → Today / Plans / Progress. Create personal plan or receive a published coach plan, select a day, log actual sets, rest and finish. A completed workout pins its original prescription snapshot.
2. Coach: existing Coaching workspace → Training / student follow-up. Build or copy a template, assign a dated immutable plan version, review explicitly shared workouts, receive weekly check-ins and reply privately.
3. Public services: completed service is required for verified branch review. Seller reply, authenticated report and administrator reasoned resolution/history are connected. Legacy reviews have no verified badge without valid attendance proof.
4. Other business roles retain existing scoped Commerce functions; they do not gain access to private coaching records.

## Interfaces and persistence

Training Module: `/api/v1/profile/training` owns exercises, plans, versions, assignments, workout sync and measurements. Private collaboration Module: `/api/v1/profile/coaching-collaboration` owns relationship-scoped text/image messages, sharing, check-ins and feedback. Mutating commands use stable operation IDs and optimistic revisions. A command receipt must not bypass relationship revocation.

IndexedDB stores account-scoped workout/program drafts and operation receipts pending sync; no private message media. Logout, account change and revoked session reset storage. Sync is explicit about conflicts and never silently overwrites another device. Workout rest uses a persisted deadline. Public service-worker shells/static assets support re-opening downloaded training screens; APIs and private media must never be cached by the service worker.

## Privacy and lifecycle

Athlete owns personal records. Coach access requires active relationship plus relevant sharing consent. Relationship end blocks coach access/new messages and preserves the athlete's received program/history. Measurements are optional and private by default. Export and erasure cover the new data; referenced image keys participate in backup and orphan retention.

## Acceptance

Type/lint/build gates, isolated PostgreSQL race and authorization tests, all eight role flows, responsive RTL and two-language/two-theme checks, keyboard/focus/reduced-motion and offline re-open/sync are required. Record actual evidence and limitations in the release report. No real-device, real-payment or independent-backup claim may be inferred from a mock or simulator pass.
