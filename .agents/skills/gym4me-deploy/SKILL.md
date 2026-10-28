---
name: gym4me-deploy
description: Deploy, verify, troubleshoot, or roll back Gym4Me on its existing production VPS, including its NestJS API, four Next.js apps, nginx, PostgreSQL and S3-compatible storage. Use for Gym4Me releases and deployment readiness checks.
---

# Gym4Me deployment

Resolve the Gym4Me repository root with `git rev-parse --show-toplevel`. Read root
`AGENTS.md`, `ops/vps/README.md`, and [the release procedure](references/release.md).
The skill lives in the repository so instructions and deployment code evolve together.

## Start with a read-only check

```sh
python3 .agents/skills/gym4me-deploy/scripts/preflight.py --live
```

For status/readiness requests, report the findings without deploying. For an authorized
deployment, continue through snapshot, build, backup, migration, activation and verification.
Creating or invoking this skill is not itself a request to publish a release.

## Preserve these invariants

- Verify SSH alias `gym4me-vps` still targets `188.212.99.190`. Keep SSH host verification
  enabled. Do not reinstall infrastructure or change DNS during routine releases.
- Build a new directory under `/opt/gym4me/releases/`, on Linux, sequentially. Keep
  the current release running during the build. Never build or rsync-delete in `current`.
- Include intended working-tree changes and untracked source. Use the snapshot helper
  to exclude ignored files, envs, credentials and generated output. Review the manifest's
  filenames before upload; its hash identifies the exact snapshot.
- Preserve production envs in `/etc/gym4me` and the current `AUTH_SECRET`. Local database
  URLs and storage passwords are development values. For requested service-key updates,
  transfer only the relevant key from project envs and preserve unrelated server settings.
  Preserve each web app's server `.env.production`, especially the public Neshan key.
- Back up before migrations. Use the migration role through systemd's `EnvironmentFile`
  parser. FCM JSON must be interpreted exactly like the API service, not reparsed with
  dotenv, shell `source`, or Node's `--env-file` during provider checks.
- Never reset/seed production, drop volumes, run migrations down or delete old releases
  as part of deployment. App rollback does not roll back the database.
- Keep API/web ports on loopback. Preserve `TRUST_LOOPBACK_PROXY=true` with
  `API_HOST=127.0.0.1` and nginx's replacement of incoming forwarded IP headers.
- Preserve explicit provider switches. The Saman adapter is currently sandbox-only.
  Smoke tests must not send OTPs, deliver notifications, or make real payments.

## Complete and report

Follow the release procedure through public HTTPS, static assets, full API readiness,
app proxies and private-route rejection. Active processes alone are insufficient.
On failure, preserve logs and the previous release; diagnose before repeating a failing
mutation. Establish schema compatibility before reverting code, and prefer a forward fix
when the new schema makes old code incompatible.

Report active release/source hash, public URLs, checks, and limitations. Record a receipt
in `docs/operations/`. Keep credentials out of output, manifests, skill files and Git.
