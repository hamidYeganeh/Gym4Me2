# API route conventions

All Gym4Me API endpoints use:

```text
/api/v1/{domain}/{feature}
/api/v1/{domain}/{feature}/{action-or-related-resource}
```

`domain` describes the business responsibility; `feature` identifies the capability/resource. Both are lowercase kebab-case segments. The client app (`application`, `business`, `admin`) is not a domain: role and organization scope are enforced by server authorization when each feature is implemented.

Examples below are planned contracts, not shipped feature endpoints:

| Method | Route                                         | Meaning                     |
| ------ | --------------------------------------------- | --------------------------- |
| GET    | `/api/v1/catalog/gyms`                        | Discover gyms               |
| GET    | `/api/v1/catalog/gyms/:id`                    | Gym details                 |
| POST   | `/api/v1/booking/reservations`                | Reserve capacity            |
| POST   | `/api/v1/booking/reservations/:id/cancel`     | Cancel a reservation        |
| GET    | `/api/v1/coaching/students`                   | Coach's authorized students |
| GET    | `/api/v1/coaching/students/:id/workout-plans` | Related workout plans       |
| POST   | `/api/v1/memberships/packages/:id/renew`      | Renew a package             |

Use the root for collection operations, `/:id` for a resource, and suffixes for actions or related resources. GET is read-only. Use POST for state-changing actions, PATCH for partial updates, and DELETE only where actual removal is the intended behavior. Pagination and filters belong in query parameters. Route examples do not bypass permissions or organization ownership checks.

## NestJS implementation

```ts
@DomainController("booking", "reservations")
export class ReservationsController {
  @Get()
  list() {
    /* ... */
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id") id: string) {
    /* ... */
  }
}
```

`configureApi` applies the global `api` prefix and URI versioning. `DomainController` supplies the two domain/feature segments, version `1` and the OpenAPI tag. Do not repeat `api/v1` inside controllers. A future incompatible version can use the decorator's third argument.

Controller folders follow the same boundaries:

```text
src/modules/{domain}/{feature}/{feature}.controller.ts
```

The system health feature is the working reference. The e2e fixture checks collection and action routing plus absence of legacy and unimplemented versions. Swagger UI is available at `/api/v1/system/docs` outside production by default.
