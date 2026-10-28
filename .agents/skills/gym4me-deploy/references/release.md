# Existing production VPS

Source of truth: `ops/vps/README.md` and its templates. The initial receipt is
`docs/operations/vps-deployment-2026-10-28.fa.md`; treat historical observations as
history and verify the live target. Routine releases do not need bootstrap or DNS changes.

## Prepare a release

Run preflight with `--live`, inspect the intended Git changes and pending migrations,
and run checks appropriate to the change. A dirty tree is supported deliberately.
Review whether the old code will remain compatible with the new schema before relying
on rollback. Read installed Turbo/Next docs before changing their commands/configuration.

From the local repository, run dependent steps only after the previous succeeds:

```sh
GYM_REPO=$(git rev-parse --show-toplevel)
GYM_RELEASE=$(date -u +%Y%m%dT%H%M%SZ)
GYM_SNAPSHOT="$GYM_REPO/.ops-private/deploy/$GYM_RELEASE"
python3 "$GYM_REPO/.agents/skills/gym4me-deploy/scripts/preflight.py" \
  --repo "$GYM_REPO" --snapshot "$GYM_SNAPSHOT" --live
```

Review filenames in `.gym4me-release.json` inside the snapshot. Its source hash covers
the uploaded files. Do not modify the snapshot after hashing. Then upload:

```sh
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes gym4me-vps \
  "test ! -e '/opt/gym4me/releases/$GYM_RELEASE' && mkdir '/opt/gym4me/releases/$GYM_RELEASE'"
rsync -az -e 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes' \
  "$GYM_SNAPSHOT/" "gym4me-vps:/opt/gym4me/releases/$GYM_RELEASE/"
```

Keep release identifiers to the UTC timestamp format above. Use a new timestamp if
the directory exists. Do not overwrite another release.

## Build, migrate and activate

In a root SSH shell, set `GYM_RELEASE` to the same timestamp. Keep this shell open so
the lock remains held. A reconnect requires reacquiring the lock and inspecting state.
The commands below assume an authorized deployment and successful prior steps.

```sh
set -euo pipefail
exec 9>/run/lock/gym4me-deploy.lock
flock -n 9
GYM_NEW="/opt/gym4me/releases/$GYM_RELEASE"
GYM_PREVIOUS=$(readlink -f /opt/gym4me/current)
case "$GYM_PREVIOUS" in /opt/gym4me/releases/*) ;; *) exit 1 ;; esac
printf '%s\n' "$GYM_PREVIOUS" > "$GYM_NEW/.previous-release"
for GYM_APP in application admin business website; do
  if test -f "$GYM_PREVIOUS/apps/$GYM_APP/.env.production"; then
    install -m 600 "$GYM_PREVIOUS/apps/$GYM_APP/.env.production" \
      "$GYM_NEW/apps/$GYM_APP/.env.production"
  fi
done
chown -R gym4me:gym4me "$GYM_NEW"
runuser -u gym4me -- sh -c 'cd "$1" && /usr/local/bin/pnpm install --frozen-lockfile' sh "$GYM_NEW"
runuser -u gym4me -- bash "$GYM_NEW/ops/vps/build-release.sh" "$GYM_NEW"
/usr/local/sbin/gym4me-backup
systemd-run --quiet --wait --pipe --collect \
  --unit="gym4me-migrate-$GYM_RELEASE" \
  --property=User=gym4me --property=Group=gym4me \
  --property=EnvironmentFile=/etc/gym4me/migration.env \
  --working-directory="$GYM_NEW/apps/api" \
  /usr/local/bin/node --import tsx scripts/migrate.ts
```

Verify backup output and exit status before migration. The backup command validates the
dump inventory; it covers the database, not uploaded media or offsite replication.
The build preserves the existing web env containing Neshan's public key; server secrets
remain outside releases. Do not rotate `AUTH_SECRET` during a routine release.

After successful build, backup and migration, atomically switch and restart:

```sh
ln -s "$GYM_NEW" "/opt/gym4me/.current-$GYM_RELEASE"
mv -Tf "/opt/gym4me/.current-$GYM_RELEASE" /opt/gym4me/current
systemctl restart gym4me-api gym4me-web@application gym4me-web@admin \
  gym4me-web@business gym4me-web@website
```

Wait up to 60 seconds for startup readiness, allowing short transient failures.
Require both database and storage to be up. Run local preflight with `--live` again,
then check public pages, their JS/CSS assets, and changed flows in a browser.

- Website: `https://gym4me.ir` and `https://www.gym4me.ir`.
- Apps: `https://app.gym4me.ir`, `https://business.gym4me.ir`, `https://admin.gym4me.ir`.
- Full readiness: `https://api.gym4me.ir/api/v1/system/health/ready`.
- Through each app's proxy, `/api/v1/auth/sessions` with its matching `Origin` and
  `x-gym-client` but no cookie should return 401; an invalid Origin should return 403.
- Swagger stays disabled, private ports stay on loopback, and backup/certificate timers
  remain enabled. Reboot/renewal drills are appropriate after infrastructure changes.

If requested, verify provider connections using the API's actual environment parser:

```sh
systemd-run --quiet --wait --pipe --collect \
  --unit="gym4me-provider-check-$GYM_RELEASE" \
  --property=EnvironmentFile=/etc/gym4me/api.env \
  --working-directory=/opt/gym4me/current \
  /usr/local/bin/node ops/vps/check-providers.cjs
```

This reads SMS credit, validates FCM without delivery, fetches a Neshan tile, checks S3,
and creates a **sandbox** bank token. It does not test actual device delivery/live banking.
For download failures, consult current Runflare instructions at
<https://runflare.com/mirrors/>. Keep pnpm integrity, apt signatures and image digests;
do not buy quota automatically or infer available quota from having an account.

Record source hash, old/new release paths, backup, migration result, checks and limits
in `docs/operations/`. Close the shell to release the lock.

## Failure and rollback

Before activation, leave `current` unchanged if any step fails. A failed migration may
have committed earlier migrations. Never reset the database to match code. Preserve logs
and the staged directory, diagnose the error, and avoid repeating unchanged mutations.

After activation, inspect `journalctl -u gym4me-api -n 60 --no-pager` and affected web
units. Do not publish logs containing secrets. Review schema compatibility before using
the saved previous release. If compatible, in the locked server shell:

```sh
GYM_PREVIOUS=$(cat "$GYM_NEW/.previous-release")
case "$GYM_PREVIOUS" in /opt/gym4me/releases/*) ;; *) exit 1 ;; esac
test -f "$GYM_PREVIOUS/apps/api/dist/main.js"
ln -s "$GYM_PREVIOUS" "/opt/gym4me/.rollback-$GYM_RELEASE"
mv -Tf "/opt/gym4me/.rollback-$GYM_RELEASE" /opt/gym4me/current
systemctl restart gym4me-api gym4me-web@application gym4me-web@admin \
  gym4me-web@business gym4me-web@website
```

Repeat readiness, HTTP and proxy checks. If compatibility is uncertain, prepare a forward
fix instead. Database restore is a separate recovery operation with a specific recovery
point and an assessment of data loss; it is not part of ordinary code rollback.
