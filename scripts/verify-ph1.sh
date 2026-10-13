#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../apps/api"
# Sequential: these suites share one explicitly isolated _test database.
node_modules/.bin/jest --runInBand --watchman=false
node_modules/.bin/jest --config test/jest-e2e.json --runInBand --watchman=false
node --import tsx --test test/database.integration.test.ts
node_modules/.bin/jest --config test/jest.integration.json --runInBand --watchman=false
node_modules/.bin/jest --config test/jest.clubs.json --runInBand --watchman=false
node --import tsx --test ../../apps/application/test/*.test.ts ../../packages/api/test/*.test.ts
node --test ../../packages/i18n/test/*.test.cjs
node ../../packages/i18n/scripts/check-copy.cjs
