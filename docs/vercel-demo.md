# Gym4Me demo on Vercel

This deployment uses four Hobby projects and one isolated Neon Free database.
No live SMS or payment provider is configured. Use synthetic data only.

## Configuration

- Git branch: `codex/vercel-demo` in `hamidYeganeh/Gym4Me2`.
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
`apps/api/scripts/seed-demo.ts` with
`DEMO_PROVISION_CONFIRM=gym4me-demo-postgres` and the API environment.
The seed refuses an existing user database. A database marker is required
before demo mode can start. An incomplete seed requires inspection; it is
not silently reset or treated as complete.

## Test accounts

Use **OTP 11111** with these synthetic numbers. No SMS is sent.

| Role | Phone | Surface |
| --- | --- | --- |
| Owner, Aftab gym | 09000000001 | Business |
| Owner, Sepidar gym | 09000000002 | Business |
| Athlete | 09000000003 | Application |
| Platform admin | 09000000004 | Admin |
| Branch manager | 09000000005 | Business |
| Receptionist | 09000000006 | Business |
| Accountant | 09000000007 | Business |

The normal session, authorization, consent and rate-limit checks still run.
Only seeded numbers can request demo OTPs; changing phone numbers is disabled
in the demo. The payment screen supports success, failure, timeout and late
confirmation. An admin can reconcile pending payments.

## Demo limits

Uploads use a private demo table instead of a paid object-storage service:
4 MiB per file, 40 MiB total. Private previews expire after 60 seconds.
The standard S3 adapter remains the default outside demo mode.

Demo accounts and data are shared between visitors. Do not enter real personal
or financial information. Retention and background commerce timers are disabled
for the serverless demo; time-based tasks are not continuously processed.
Sample class sessions are dated relative to the initial seed.

Vercel and Neon free-tier quotas apply. No paid plan, paid domain or automatic
upgrade is part of this setup. This is a demonstration environment, not a
production acceptance certificate.
