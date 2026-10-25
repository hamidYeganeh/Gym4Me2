# Gym4Me API

NestJS modular API with PostgreSQL, Drizzle migrations and versioned domain routes. `application` serves athletes and coaches, `business` serves gyms, and `admin` serves Gym4Me operations. They share this API.

## Local development

From the repository root:

```sh
pnpm install
# First setup only; keep an existing .env.
cp apps/api/.env.example apps/api/.env
pnpm db:up
pnpm db:migrate
pnpm --filter api dev
```

PostgreSQL 18 is exposed only on `127.0.0.1:55432`. Development credentials are in `.env.example` and `compose.yaml`; these are local defaults. `pnpm db:down` stops PostgreSQL and retains its named volume. Use separate credentials and deployment configuration in production.

The API validates configuration and checks the PostgreSQL connection at startup. It loads `apps/api/.env`; environment variables take precedence. Required: `DATABASE_URL`. Optional: `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`, `API_DOCS_ENABLED`. Set PostgreSQL TLS options in the deployment connection URL, according to the provider's certificate configuration.

## HTTP contract

```text
/api/v1/{domain}/{feature}
/api/v1/{domain}/{feature}/{action-or-related-resource}
```

Implemented endpoints:

| Method | Path                          | Purpose                                                    |
| ------ | ----------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/system/health`       | Process liveness                                           |
| GET    | `/api/v1/system/health/ready` | PostgreSQL connectivity and initial schema; 503 on failure |
| GET    | `/api/v1/system/docs`         | Swagger UI                                                 |
| GET    | `/api/v1/system/docs/json`    | OpenAPI JSON                                               |
| GET    | `/api/v1/system/docs/yaml`    | OpenAPI YAML                                               |

Documentation is disabled by default in production; `API_DOCS_ENABLED` explicitly overrides this. Old `/`, `/health` and `/api/health` endpoints are removed. The readiness response never includes connection strings or internal PostgreSQL errors.

Controllers use `@DomainController('domain', 'feature')`; Nest adds `/api/v1`. See [API conventions](../../docs/api-conventions.md). The reservation routes in tests/documentation illustrate the contract; booking, authentication and other product APIs are not implemented by this infrastructure change.

Web apps preserve the `/api` prefix when proxying to `API_URL` (an origin, such as `http://localhost:7088`). Browser clients use `/api/v1`. A native client must use a full public base URL such as `https://api.example.com/api/v1`; native bundles cannot use the Next.js proxy. Shared API health UI appends `/system/health/ready` to that base URL.

## Database

`src/database/database.service.ts` owns one connection pool, initializes Drizzle, checks connectivity and closes connections during shutdown. Feature modules import `DatabaseModule` and inject `DatabaseService`; related writes use `database.db.transaction(...)`.

The initial schema contains:

- `users`: one identity for an athlete/coach, unique phone number.
- `organizations`: gym organizations, unique slug.
- `branches`: organization-owned locations, scoped unique slug, a restrictive foreign key, and a composite organization/id key for future ownership-safe references.

Timestamps use `timestamptz`. Future mutations must update `updatedAt` explicitly. This schema is a foundation; role assignments, authorization/RLS, booking, financial ledgers and queues are added with their domain implementations. No user-data endpoints are exposed yet.

```sh
# Edit src/database/schema.ts, then generate and review SQL.
pnpm db:generate --name describe-your-change
# Apply committed migrations; running again is safe.
pnpm db:migrate
# Optional local data browser.
pnpm db:studio
```

Migrations are committed under `database/migrations`, including Drizzle metadata. The migration runner uses a PostgreSQL advisory lock to serialize concurrent release jobs. It is separate from API startup. Do not use schema push in production. Run migration commands in a release job with the development tooling (`tsx`) available, then start the compiled API with `pnpm --filter api start:prod`.

## Verification

```sh
pnpm --filter api check-types
pnpm --filter api lint
pnpm --filter api test --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter api build

# Isolated PostgreSQL test service, with ephemeral storage.
pnpm db:test:up
pnpm test:db
pnpm db:test:down
```

Database tests target `127.0.0.1:55433/gym4me_test` by default and never use `DATABASE_URL`. Override with `TEST_DATABASE_URL` pointing to a dedicated database whose name ends in `_test`. Tests apply migrations twice, verify transaction rollback, scoped uniqueness and foreign keys, and remove only their own fixture rows.

## Location discovery

`GET /api/v1/catalog/locations/discovery` returns linked `provinces`, `cities`, and `districts` arrays (up to 12 cards each), the resolved hierarchy, and a browsing seed. Optional UUID filters constrain that hierarchy; conflicting ancestors return 400 and unknown locations return 404. Selected cards are included first. Guests pass `randomize=true` and reuse the returned seed while browsing.

Each public geography record includes `clubCount`: distinct clubs with an approved organization, published club and complete, unarchived public branch in that location. Multiple branches of a club do not inflate its count. Administrative geography endpoints retain their existing shape.

Authenticated application sessions read or update their saved preference with `GET` / `PATCH /api/v1/profile/account/location`. PATCH requires `provinceId`, accepts optional `countryId` and nullable `cityId` / `districtId`, validates their relationships and clears omitted descendants. The user ID comes from the session. Migration `0040_account_locations.sql` adds storage and database hierarchy constraints; privacy exports and account erasure include the preference.

`AUTH_WEBSITE_ORIGIN` (default `http://localhost:7084`) allows the website to use the shared application session for only those two location operations. Other authenticated routes keep their original surface restrictions. The current web session cookie is host scoped: both surfaces must use the same hostname to share sign-in. Separate hostnames require a session-sharing configuration.

Run the integration suite against a dedicated PostgreSQL database:

```sh
TEST_DATABASE_URL=postgresql://localhost/gym4me_locations_test pnpm --filter api test:locations
```

The suite applies migrations twice, exercises club visibility/deduplication, guest ordering, hierarchy changes, account isolation and website origin restrictions, and removes only its own fixture rows.

## Booking calendar dates

`GET /api/v1/sports/account/bookings/page?tab=upcoming|past&day=YYYY-MM-DD` optionally filters the signed-in account's bookings to a Gregorian ISO day in `Asia/Tehran`. Filtering happens before pagination. Cursors retain the account, tab, date filter and original time boundary; changing a filter requires a fresh cursor. Omitting `day` preserves the existing full-list contract. No database migration is required for this filter.

The calendar unit suite is `src/modules/commerce/booking-calendar.spec.ts`. Run the read-only PostgreSQL boundary checks with `TEST_DATABASE_URL=postgresql://localhost/gym4me_locations_test node --import tsx --test test/booking-calendar.integration.test.ts` from this workspace. They cover Tehran midnight and historical daylight-saving dates.
