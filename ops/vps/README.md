# Gym4Me VPS deployment

Target: Ubuntu 24, `188.212.99.190`, 2 cores / 4 GB RAM. Domain: `gym4me.ir`.
These files prepare the deployment; their presence does not mean the server is deployed.

For future releases, use `$gym4me-deploy` in Codex. The project skill is at
[SKILL.md](../../.agents/skills/gym4me-deploy/SKILL.md), with a source snapshot helper
and the staged release/rollback procedure. A read-only readiness check is:

```sh
python3 .agents/skills/gym4me-deploy/scripts/preflight.py --live
```

## Services

| Host | Process | Loopback port |
| --- | --- | --- |
| gym4me.ir | website | 7084 |
| www.gym4me.ir | website | 7084 |
| app.gym4me.ir | application | 7081 |
| admin.gym4me.ir | admin | 7082 |
| business.gym4me.ir | business | 7083 |
| api.gym4me.ir | api | 7088 |

Install Node.js 24+, pnpm 11.25.0, Docker Compose, nginx and Certbot.
The service templates expect Node and pnpm at `/usr/local/bin`; verify those paths
against the installed binaries before installing the units. Create a `gym4me`
system user with `/opt/gym4me` as its home. Keep configuration under
`/etc/gym4me` (root-owned, mode 0700), code in `/opt/gym4me/releases/<release>`,
and use `/opt/gym4me/current` as the active release symlink.

Copy `compose.yaml` and `init-db.sql` to `/etc/gym4me/infra`. Generate independent
random values for `POSTGRES_PASSWORD`, `MIGRATION_PASSWORD`, `RUNTIME_PASSWORD`,
`S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` in a root-only infrastructure env
file. Never use the credentials from the local development Compose file.

The API's `/etc/gym4me/api.env` must set `NODE_ENV=production`,
`API_HOST=127.0.0.1`, `TRUST_LOOPBACK_PROXY=true`, `PORT=7088`, a fresh `AUTH_SECRET`, and the runtime
database URL on `127.0.0.1:55432`. Set all four `AUTH_*_ORIGIN` values and
`CORS_ORIGINS` to the HTTPS origins above; include the website origin and the
existing native origins. Set `PUBLIC_API_ORIGIN=https://api.gym4me.ir`, and
configure S3 with the generated credentials and `http://127.0.0.1:8333`.
Disable Swagger and demo mode. Retain the application's explicit SMS/payment
provider switches; credentials alone do not activate a provider. The current
payment implementation supports mock/sandbox, so deployment is not acceptance
of live payments.

## Build and activate

Upload a snapshot of the current working tree, including untracked application
source but excluding `.git`, all env files, private operations files,
`node_modules`, local builds, test evidence, and native build output. Record its
source hash. Never upload the entire working directory indiscriminately.

Install with the frozen pnpm lockfile on Linux. Build the API and four web apps
sequentially on this small server; do not run the development servers. Set
`API_URL=http://127.0.0.1:7088`,
`NEXT_PUBLIC_SITE_URL=https://app.gym4me.ir`, and
`NEXT_PUBLIC_APPLICATION_ORIGIN=https://app.gym4me.ir` while building. Preserve
any configured public map key. If build memory is tight, provision swap before
building and use Next's Webpack fallback with a bounded heap.

Apply migrations using `gym4me_migrator`, not the runtime role. Existing databases
must be backed up first. Do not reset, reseed, or migrate down during deployment
or rollback. Run the API with the runtime role. Install and enable the API and
four web systemd units. Install the nginx site, test with `nginx -t`, and check
every host using the destination IP before switching DNS.

Change A records only after verifying the existing DNS zone. Preserve mail and
unrelated records. Remove or update conflicting AAAA records for these hosts.
Issue HTTPS certificates after DNS resolves to this VPS and confirm automatic
renewal. Expose only SSH, HTTP and HTTPS; PostgreSQL, storage and application
ports remain bound to loopback.

## Acceptance

- `https://api.gym4me.ir/api/v1/system/health/ready` reports both database and storage up.
- All four frontends serve their pages and static assets through HTTPS.
- App/business/admin API proxies work; authentication and private data require a valid session.
- Real OTP delivery and bank transactions are not part of a smoke test.
- Verify systemd restart policies, certificate renewal and a database backup.
- Keep backups outside this VPS before treating the deployment as durable production.

## Mirrors

Use the official registries first. If they are unavailable, Runflare documents
`https://mirror-npm.runflare.com/`, `https://mirror-nodejs.runflare.com/dist/`,
`https://mirror-docker.runflare.com`, and Ubuntu package mirrors at
<https://runflare.com/mirrors/>. Preserve pnpm integrity checks, image digests,
and signed apt metadata. The free mirror quota is 500 requests per source IP;
an existing account does not itself prove this server has a paid quota. Do not
purchase a package without the user's authorization.

## Rollback

Keep the previous release directory and record the previous `current` target.
After confirming API/schema compatibility, repoint `current`, restart services
and repeat readiness/HTTP checks. Do not revert the database as part of this step.
