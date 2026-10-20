# Gym4Me demo on Vercel

This deployment uses four Hobby projects and one isolated Neon Free database.
No live SMS or payment provider is configured. Use synthetic data only.

## Configuration

- Git branch: `main` (demo branch merged on 2026-10-20) in `hamidYeganeh/Gym4Me2`.
- Projects: `gym4me-demo-api`, `gym4me-demo-application`,
  `gym4me-demo-business`, `gym4me-demo-admin`.
- Root directories: the matching directories under `apps/`.
- Node: 24. Web build: `pnpm exec next build --webpack`.
- API build: `pnpm build`; NestJS detects `src/main.ts`.
- Install: `pnpm install --frozen-lockfile`.
- Each web project's `API_URL` points to the API project's verified HTTPS domain.
- API: `DEMO_MODE=true`, `RETENTION_ENABLED=false`, `API_DOCS_ENABLED=false`,
  `DB_POOL_MAX=3`, `DB_CONNECTION_TIMEOUT_MS=15000`, `PRIVACY_POLICY_VERSION=demo-v1`.
- `AUTH_SECRET` is a randomly generated Vercel Secret. The Neon integration
  supplies `DATABASE_URL`. Neither belongs in Git.
- Set `PUBLIC_API_ORIGIN`, the three `AUTH_*_ORIGIN` values and `CORS_ORIGINS`
  to the actual deployment domains.

## Provisioning

Run `apps/api/scripts/migrate.ts` against the new demo database, then
`apps/api/scripts/seed-demo.ts` with `ts-node` (Nest requires decorator metadata),
`DEMO_PROVISION_CONFIRM=gym4me-demo-postgres` and the API environment.
The seed refuses an existing user database. A database marker is required
before demo mode can start. An incomplete seed requires inspection; it is
not silently reset or treated as complete.

## Test accounts

Use **OTP 11111** with these synthetic numbers. No SMS is sent.

| Role               | Phone       | Surface     |
| ------------------ | ----------- | ----------- |
| Owner, Aftab gym   | 09000000001 | Business    |
| Owner, Sepidar gym | 09000000002 | Business    |
| Athlete            | 09000000003 | Application |
| Platform admin     | 09000000004 | Admin       |
| Branch manager     | 09000000005 | Business    |
| Receptionist       | 09000000006 | Business    |
| Accountant         | 09000000007 | Business    |
| Coach              | 09000000008 | Application |

The normal session, authorization, consent and rate-limit checks still run.
Only seeded numbers can request demo OTPs; changing phone numbers is disabled
in the demo. The payment screen supports success, failure, timeout and late
confirmation. An admin can reconcile pending payments.

## PH2/PH3 demo flows

The current implementation and acceptance status are recorded in
[PH2/PH3 acceptance](qa/ph2-ph3-demo-2026-10-20.md). Deployment is verified there
before a new route is considered available online.

- Application `/coaching`: profile, credentials, availability, sessions,
  relationships, student assessment, notes and read-only contract/income history.
- Application `/coaches`: approved public coaches, filters, tariffs and
  relationship requests. A relationship is required before buying coaching.
- Business `/coaching`: affiliated approved coaches, services, fee breakdown,
  versioned contracts and referenced manual financial entries.
- Admin `/coaching`: private credentials, approval/rejection with reason and expiry, and reported coach reviews with reasoned hide/keep decisions and history.
- Coach detail supports verified-session reviews, coach replies and authenticated reports. Ending collaboration preserves existing booking purchase/cancellation terms while revoking private access and new sales.

Coach `09000000008` and athlete `09000000003` use the same application. For
sequential role testing, sign out before changing accounts. Existing sport
services, memberships, court/course booking, QR reception, refunds and admin
reconciliation use the same mock commerce engine.

Invitees explicitly accept or decline; either participant may end collaboration.
Pending phone invitations do not expose private recipient identity. Assessment
sharing is opt-in, and the coach loses private-record access after termination.
Credential verification in seeded data is explicitly synthetic. No real coach
qualification or attendance is asserted by the demo.

## Demo limits

Uploads use a private demo table instead of a paid object-storage service:
4 MiB per file, 40 MiB total. Private previews expire after 60 seconds.
The standard S3 adapter remains the default outside demo mode.

Demo accounts and data are shared between visitors. Do not enter real personal
or financial information. Retention and background commerce timers are disabled
for the serverless demo. Successful sports/coaching commands await the durable job runner,
so mock refunds and notifications can complete without an always-running server.
Catalog refresh also processes due work before reading capacity. Time-based tasks are not continuously processed while the demo is idle.
Sample class sessions are dated relative to the initial seed.

Vercel and Neon free-tier quotas apply. No paid plan, paid domain or automatic
upgrade is part of this setup. This is a demonstration environment, not a
production acceptance certificate.
