#!/usr/bin/env bash
set -euo pipefail
umask 077
install -d -m 700 /var/backups/gym4me
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="/var/backups/gym4me/database-$stamp.dump"
partial="$target.partial"
trap 'rm -f "$partial"' EXIT
docker compose --env-file /etc/gym4me/infra/infra.env \
  -f /etc/gym4me/infra/compose.yaml exec -T postgres \
  pg_dump -U gym4me_admin -d gym4me --format=custom > "$partial"
test -s "$partial"
docker compose --env-file /etc/gym4me/infra/infra.env \
  -f /etc/gym4me/infra/compose.yaml exec -T postgres \
  pg_restore --list < "$partial" > /dev/null
mv "$partial" "$target"
find /var/backups/gym4me -maxdepth 1 -name 'database-*.dump' -type f -mtime +7 -delete
echo "$target"
