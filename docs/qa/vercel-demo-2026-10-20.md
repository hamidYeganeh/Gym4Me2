# Vercel demo acceptance — 2026-10-20

Account: `hamidyeganeh82@gmail.com`, scope `hamidyeganehs-projects`.
Vercel Hobby and isolated Neon Free resource `gym4me-demo-postgres`.
No paid plan, domain purchase, live SMS or live payment provider was enabled.

## Published surfaces

| Surface | URL | Source |
| --- | --- | --- |
| Athlete | https://gym4me-demo-application.vercel.app | `3ed21c9` |
| Business | https://gym4me-demo-business.vercel.app | `3ed21c9` |
| Admin | https://gym4me-demo-admin.vercel.app | `3ed21c9` |
| API | https://gym4me-demo-api.vercel.app | `3112c2b` |

All four deployments reached Ready. Both commits were pushed to
`hamidYeganeh/Gym4Me2`, branch `codex/vercel-demo`, before deploying.
The second commit changes API job execution and documentation only.

## Verified

- TypeScript and changed-file ESLint passed.
- API unit tests: 9 suites, 35 tests passed.
- Protected design check: all 59 protected files unchanged.
- API HTTPS readiness: migrated database and demo storage both up.
- Live API sign-in and permissions loaded for seven seeded role accounts.
- Published catalog contained six sports services.
- Mock payment succeeded and created a confirmed reservation.
- Chrome: athlete, business owner and platform admin signed in through their
  respective production web URLs; profile/overview data loaded correctly.
- Athlete home displayed the confirmed reservation from the online API test.
- Live image put/read succeeded. Signed HTTPS preview returned the image.
  Tampered proof returned 404; oversized upload was rejected. Test file removed.
- Through the athlete web API proxy: a second mock purchase, cancellation and
  automatic mock refund completed. Refund state was `succeeded`. The initial
  confirmed reservation remains available for demonstrating the product.

Test receipts and screenshot are local, ignored artifacts under
`.ops-private/vercel-demo/` and `.artifacts/vercel-demo/`; no session cookies or
connection secrets were committed.

See [demo setup and role accounts](../vercel-demo.md). Use OTP `11111`.
Each new demo account still follows the normal profile policy/age confirmation
before writes. Accounts and changes are shared between demo visitors.

This is web demo acceptance. It does not claim native-device or production
infrastructure acceptance.
