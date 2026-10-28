#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl xz-utils python3 \
  docker.io docker-compose-v2 nginx certbot python3-certbot-nginx ufw rsync

if ! command -v node >/dev/null; then
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  curl --fail --silent --show-error --retry 3 https://nodejs.org/dist/index.json -o "$work/index.json"
  version=$(python3 -c 'import json,sys; print(next(v["version"] for v in json.load(open(sys.argv[1])) if v["version"].startswith("v24.")))' "$work/index.json")
  archive="node-${version}-linux-x64.tar.xz"
  curl --fail --silent --show-error --retry 3 "https://nodejs.org/dist/$version/$archive" -o "$work/$archive"
  curl --fail --silent --show-error --retry 3 "https://nodejs.org/dist/$version/SHASUMS256.txt" -o "$work/SHASUMS256.txt"
  (cd "$work"; awk -v file="$archive" '$2 == file' SHASUMS256.txt | sha256sum --check --strict)
  tar -xJf "$work/$archive" --no-same-owner --strip-components=1 -C /usr/local
fi
npm install -g pnpm@11.25.0
id gym4me >/dev/null 2>&1 || useradd --system --user-group --create-home --home-dir /opt/gym4me --shell /usr/sbin/nologin gym4me
install -d -m 755 -o gym4me -g gym4me /opt/gym4me/releases
install -d -m 700 /etc/gym4me /etc/gym4me/infra /var/backups/gym4me
if [[ $(awk '/SwapTotal/ {print $2}' /proc/meminfo) == 0 ]]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
systemctl enable --now docker nginx
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
node --version
pnpm --version
docker compose version
