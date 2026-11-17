# Club onboarding

Run PostgreSQL with the existing Compose configuration, then apply the migration to the Gym4Me database.

```sh
docker compose -f compose.dev.yaml up -d
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
  -f apps/backend/migrations/001-onboarding.sql \
  -f apps/backend/migrations/002-auth.sql \
  -f apps/backend/migrations/003-club-publication.sql \
  -f apps/backend/migrations/004-coach-requests.sql \
  -f apps/backend/migrations/005-coach-request-review.sql \
  -f apps/backend/migrations/006-fitness-resources.sql \
  -f apps/backend/migrations/007-club-schedule.sql
```

Provision the first administrator directly in PostgreSQL. Replace the example with the administrator's verified mobile number in international format.

```sql
WITH admin_account AS (
  INSERT INTO accounts(phone) VALUES ('+989120000000')
  ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id
)
INSERT INTO account_roles SELECT id,'admin' FROM admin_account ON CONFLICT DO NOTHING;
```

Set `DATABASE_URL` and `AUTH_SECRET` in the backend environment. Set `OTP_MODE=console` for local development to read OTP codes in the backend log. Set `OTP_MODE=kavenegar` for live SMS in development. Production always uses Kavenegar Verify Lookup with the server-side `KAVENEGAR_API_KEY` and `KAVENEGAR_OTP_TEMPLATE` (default `gym4meotp`). Run `npm run dev -w backend` with these environment variables exported. The first panel login uses OTP. Complete the account profile and set a password. If a password is already set, account completion keeps it. Apply migration 002 before deploying the updated backend. Existing sessions issued before the migration require a new sign-in.

Select `KAVENEGAR_OTP_TEMPLATE=g4m-otp` after Kavenegar approves the new verification template. The previous `gym4meotp` template is available for deployments already using it. To load the untracked root `.env` from the repository root, run `node --env-file=.env apps/backend/dist/main.js` after building the backend. Kavenegar replaces `%token` with the six-digit code.

```text
کد تأیید جیم‌فورمی: %token
اعتبار کد: ۵ دقیقه
```

Both panels read `PANEL_OTP_API_ORIGIN` on the server and default to port 3003 locally. The static application uses `NEXT_PUBLIC_CLUB_API_ORIGIN` and `NEXT_PUBLIC_BUSINESS_PANEL_URL` at build time. Configure `APPLICANT_ORIGINS` on the backend with the exact web and Capacitor origins. The Business panel takes `NEXT_PUBLIC_CLUB_APPLICATION_URL` at build time for its request link.

- Applicant at `/club-registration/`. Verify the mobile, submit the club profile, and refresh the request list to see the decision and rejection reason.
- Admin at `/club`. Sign in as the provisioned account and approve or reject a pending request.
- Business at `/club`. Sign in with the approved mobile. When the account has an approved request and no clubs, the dashboard opens the setup form. Review the prefilled profile and create the club. Clubs created under the previous approval flow remain available.

All backend routes are under `/api/v1`. Each audience has `POST /{audience}/auth/otp`, `POST /{audience}/auth/otp/confirm` and `POST /{audience}/auth/login`. The panels receive audience-specific HttpOnly session cookies. Applicants receive a bearer token held in page memory. All scopes support `GET /{audience}/auth/session` and `POST /{audience}/auth/logout`. The panels also support `POST /{audience}/auth/account/complete`, `POST /{audience}/auth/password/reset/request`, and `POST /{audience}/auth/password/reset/confirm`. Logout revokes the current session. Password reset revokes all sessions for that account. The workflow uses `GET/POST /applicant/club-requests`, `GET /admin/club-requests`, `PATCH /admin/club-requests/:id` and `GET /business/clubs/setup`, `POST /business/clubs/setup/:id`, `GET /business/clubs`, `GET/PATCH /business/clubs/:id`.

Set `KAVENEGAR_PASSWORD_RESET_TEMPLATE=g4m-set-password` after Kavenegar approves the password setup template. Admin and Business use it when requesting a password reset code. If the variable is empty, both use the sign-in OTP template.

Auth limits use a shared PostgreSQL 15-minute window.

| Action                              | Per client IP | Per phone or account                                                                              |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| OTP send and password recovery send | 50 combined   | 5 SMS requests combined per phone, with a 60-second resend cooldown per code purpose and audience |
| OTP and recovery code confirmation  | 100 combined  | 5 guesses per code                                                                                |
| Password sign-in                    | 100           | 12 attempts per phone across all audiences                                                        |
| Account completion                  | —             | 12 submissions per signed-in account                                                              |

Throttled responses are HTTP 429 with a `Retry-After` header and a JSON `retryAfter` field, both in seconds. The application can read this header across origins. For deployments behind a reverse proxy, set `AUTH_TRUSTED_PROXIES` to the exact IPs or CIDRs of trusted hops. The public edge must sanitize incoming forwarding headers and supply the real client IP. With this setting empty, IP limits use the backend's direct peer address.

Existing browser and SQLite records require a verified mapping to owner accounts before import. The onboarding migration creates the PostgreSQL tables without importing legacy records.

## Publication and club resources

- In the admin panel, open `/club/resources` to add and maintain the locations, types, sports, equipment, and amenities. The migration seeds Iran plus the existing club types and common media types. Add provinces, cities and sports before accepting new applications. Resources use stable IDs. Deactivation removes an option and its descendants from public selection while keeping existing references.
- Admins approve initial applications at `/club`. The business owner completes the club and submits it for publication review. Admins review the submitted profile, including gallery items, at `/club/publications`. Rejection requires a reason and the owner can submit a corrected revision. An edit to a published club keeps the last approved profile visible until the new revision is approved. Legacy clubs can complete the structured profile in Business settings before publication.
- The app uses the runtime endpoints `GET /api/v1/public/clubs` and `GET /api/v1/public/clubs/:id`, and opens directory entries via `/clubs/?id=…` for static export compatibility. The APIs only expose published profiles. Admin review uses `GET /api/v1/admin/club-publications` and `PATCH /api/v1/admin/club-publications/:id` with the current `revision`, `status`, and an optional `reason` for approval or required reason for rejection.
- Resource catalog paths under `/api/v1/resources` support GET and admin-only POST. Admins update names and availability with PATCH at the corresponding resource ID. Use `parentId` on hierarchical lists and `includeInactive=true` for admin reads.
- For gallery uploads, configure a private bucket with `CLUB_MEDIA_S3_BUCKET`, `CLUB_MEDIA_S3_REGION`, and optionally `CLUB_MEDIA_S3_ENDPOINT` for an S3-compatible provider. The endpoint must be reachable by the backend and by users opening signed links. Configure credentials through the AWS SDK credential chain and give the backend permission to put and get objects under `clubs/sha256/`. The backend checks the file format, calculates SHA-256, and links the upload to the owner's approved request. The per-file limit is 20 MiB. The gallery uses the owner’s saved ordering and shows the first item at the top. Public media redirects to an expiring signed URL only if the file belongs to that club's published snapshot.

## Coach requests

Coaches can sign in and submit their name, specialty, and experience at `/coach-registration/`. The backend stores the submission with the verified applicant account. Administrators can approve, reject, or return pending submissions for changes in the Admin panel at `/coach-requests`. Rejections and returns require a message. Applicants see decisions at `/my-requests/` and can edit and resubmit a returned request with the same ID. Existing requests start as pending when migration 005 is applied.
