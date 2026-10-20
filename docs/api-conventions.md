# API conventions

Routes use `/api/v1/{domain}/{feature}` followed by a resource ID or action. Current PH1 domains are `auth`, `profile`, `catalog`, `business`, `admin` and `system`. The last two identify protected service boundaries. The URL and `x-gym-client` header grant no role: the server checks session client, consent, membership, organization and branch scope.

These PH1 examples are implemented:

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/otp/request` | Request a sign-in code |
| POST | `/api/v1/auth/otp/verify` | Verify the code |
| POST | `/api/v1/auth/sessions/:id/revoke` | Revoke an owned session |
| GET / PATCH | `/api/v1/profile/account` | Read / update the signed-in profile |
| GET | `/api/v1/catalog/clubs` | Filtered public clubs |
| POST | `/api/v1/catalog/clubs/guest-saved` | Read-only lookup with guest IDs in the body |
| PATCH | `/api/v1/business/clubs/:id/branches/:branchId` | Update an authorized branch |
| GET | `/api/v1/business/clubs/:id/media/:mediaId/preview` | Obtain an authorized temporary media URL |
| POST | `/api/v1/admin/clubs/:id/review` | Review publication with a recorded reason |
| GET | `/api/v1/catalog/locations/:kind` | Public geography page |

GET is read-only. POST handles creation/actions; guest-saved is also read-only and keeps its IDs out of URL/history logs. PATCH performs partial updates. Controllers use `@DomainController(domain, feature)`; `configureApi` supplies the prefix and version. PH1 controllers live in `apps/api/src/modules/{auth,profile,clubs,business,admin}`. Multiple controllers may share a prefix; method and subpath identify the operation.

## Validation and errors

Controller contracts validate external body/query/path values with Zod before service calls. Strict body schemas reject unknown fields; partial updates preserve absent values. OpenAPI bodies using `SchemaBody` share the same Zod schema. Multipart media has an explicit upload contract and decoder validation.

Normal errors contain `statusCode`, stable translation `code`, and localized `message`; validation adds `fields` with paths/codes/messages. `Accept-Language` chooses Persian or English. Unexpected exceptions suppress raw driver parameters in responses and general logs. System readiness503 retains its explicit dependency-health contract.

Oversized uploads/body413 use `Backend.payloadTooLarge` with localized size guidance; raw parser messages and filenames are suppressed.

The shared transport preserves `ApiError.status/code/details`, includes credentials, sends app/locale headers, disables caching and propagates cancellation. Default per-request timeout is20seconds. Multipart lets the browser set the boundary. Web rewrites and explicitly configured native/remote hosts use the same client interfaces.

## Pagination

Existing numbered lists return arrays, default to page1, validate page bounds and finish on a shorter page. Offset pages reflect current data; concurrent edits can move records between pages. Sports cursor contracts remain separate.

| PH1 list | Page size | Notes |
| --- | --- | --- |
| Public/saved/guest-saved clubs | 25 | Server filters and publication checks |
| Taxonomies | 100 | Public excludes inactive; admin can search |
| Countries | 300 | Ordered by name, then ID |
| Provinces/cities/districts | 1000 | Required parent; ordered by name, then ID |
| Admin users/organizations/audit | 25 | Validated filters |
| Public/moderated reviews and tariff history | 25 | Authorized filters and stable order |
| Own coach affiliations | 100 | `createdAt DESC, id`; validated page1–100000 |

Both `catalog/locations/:kind` and `admin/locations/:kind` accept `page` from1 through100000. UUID `parentId` is required for provinces/cities/districts. An unknown valid parent returns an empty page. The admin route requires platform-admin authorization. Swagger documents optional page/default/bounds, parent and the array response.

`catalogClients.locationPage` and `adminClients.locationPage` fetch one explicit page using `LocationFiltersDto`. Existing `locations` methods collect pages sequentially for current selectors. Cancellation stops further requests; a later failure rejects the whole result. Malformed/repeated pages fail rather than produce a partial or duplicate list. Country page size is300; other geography page sizes are1000. A full final page causes one additional empty-page request. Parent-scoped query keys also retain host/app/locale/session/domain.

`profileClients.affiliationPage` reads one affiliation page; `affiliations` collects all pages with the same cancellation/error guarantees. Club branch aggregates return the complete authorized collection. Current tariffs have an enforced100-plan limit; revision history is independently paginated. Admin user detail shows its25 most recent sessions, and overview shows5 recent events; these are previews.

## Shared client structure and evidence

`packages/api/src/{auth,profile,catalog,business,admin,system}` contains DTOs, endpoint definitions, clients, keys and hooks. Transport/session behavior is shared. DTOs are maintained TypeScript contracts; successful responses do not all have generated runtime validators. The geography collector additionally checks array/item shape and duplicate IDs.

Swagger UI/JSON are at `/api/v1/system/docs` and `/api/v1/system/docs/json` when `docsEnabled` is configured. Their availability does not prove a public production release.

[T020 acceptance](qa/ph1-contracts-2026-10-19.md) records DTO/input/error/pagination/client checks, real HTTP clients and three final web builds. [Geography](qa/ph1-location-pages-2026-10-18.md), [access](product/access-matrix.md), [files](qa/ph1-media-2026-10-18.md), [sessions](qa/ph1-mutation-session-2026-10-18.md) and [audit](qa/ph1-sensitive-audit-2026-10-18.md) have additional evidence. PH0/PH1 UI, native and independent-operation acceptance remain in [backlog](product/backlog.md).
