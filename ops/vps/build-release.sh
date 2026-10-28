#!/usr/bin/env bash
set -euo pipefail
release=${1:?Pass an absolute release directory}
[[ "$release" == /opt/gym4me/releases/* && -f "$release/pnpm-lock.yaml" ]] || exit 1
cd "$release"
export NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=2048
export API_URL=http://127.0.0.1:7088
export NEXT_PUBLIC_SITE_URL=https://app.gym4me.ir
export NEXT_PUBLIC_APPLICATION_ORIGIN=https://app.gym4me.ir
for app in api application admin business website; do
  echo "Building $app"
  pnpm --filter "$app" build
done
