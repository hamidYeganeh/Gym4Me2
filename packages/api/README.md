# Shared HTTP and server state

`@repo/api` is the frontend interface to the existing Nest backend. It centralizes cookie transport, typed domain contracts, cancellation, error codes and TanStack Query cache lifecycle. No page needs a URL, client header, fetch effect or manual cache invalidation.

Each domain (`auth`, `profile`, `business`, `admin`, `catalog`, `system`) has the same layout:

```text
auth/
  auth.endpoints.ts  # method, route and request body
  auth.dto.ts       # request/response contracts
  auth.clients.ts   # framework-independent typed HTTP calls
  auth.hooks.ts     # queries, mutations and invalidation
  auth.keys.ts      # scoped query-key factory
  index.ts
```

The server remains the authority for validation and permissions. DTOs model its wire format; they do not grant access or validate untrusted responses at runtime. Dates are serialized strings. `dayOfWeek` is Saturday `0` through Friday `6` in the branch timezone.

## Application setup

Mount a single `ApiProvider` below the locale provider:

```tsx
<ApiProvider application="business" locale={locale}>
  {children}
</ApiProvider>
```

Web apps use `/api/v1` through their Next rewrite. Configure `API_URL` for the backend origin at build time. Static/native clients must provide `NEXT_PUBLIC_API_URL` containing the full versioned URL, for example `https://api.example.com/api/v1`. Cookie acceptance and cross-origin access must match the backend configuration; no bearer tokens or client-side session secrets are introduced.

## Calling a domain

```tsx
import { useBusinessClub, useUpdateClub } from "@repo/api/business";

const club = useBusinessClub(id);
const save = useUpdateClub();
await save.mutateAsync({ id, input: { name } });
// Club details, readiness and other affected active reads update automatically.
```

Use the framework-independent interface for non-React callers:

```ts
import { createApiClient } from "@repo/api";
import { businessClients, businessKeys } from "@repo/api/business";

const api = createApiClient({ application: "business", locale: "fa" });
const club = await businessClients.club(api, id, { signal });
const key = businessKeys(api.scope).club(id);
```

`fetch` is injectable at the transport seam for contract tests. Queries pass their cancellation signal through to fetch. Missing dependent identifiers use `skipToken`; manual system probes explicitly support `refetch()` while disabled.

## Cache and errors

The provider creates its own QueryClient; there is no global server cache. Keys include host, application, locale and a session generation, followed by domain/resource/filter values. Treat filter inputs as immutable. Normal reads stay fresh for 30 seconds; account and access checks revalidate immediately. Read failures retry once, except all 4xx responses. Mutations never retry, including OTP requests.

Successful login, logout and session revocation cancel and clear cached data, then increment the generation. Old in-flight results cannot become data for the next session. Domain mutations await invalidation of affected active queries. A 409 also refreshes relevant queries so stale moderation state can be corrected.

`ApiError` exposes `status`, stable `code` and structured `details`. Render known codes through `@repo/i18n`; unknown proxy/runtime errors use a catalog fallback. The backend emits localized messages and field errors based on `Accept-Language`, keeping their codes unchanged. System health retains its original machine-readable contract.

## Verification

```sh
pnpm --filter @repo/api test
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/i18n test
pnpm --filter @repo/i18n check-copy
```

The copy guard checks application/shared UI presentation text and backend catalog codes. Protocol values, identifiers, styles, diagnostics and test fixtures remain code. Both locales must have identical message keys and ICU interpolation arguments.

Reference: [TanStack query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation), [mutation invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations), [next-intl translations](https://next-intl.dev/docs/usage/translations).
