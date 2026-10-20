# Auth routes and Bencho OTP — 2026-10-18

## Changes

- Application password sign-in lives at `/auth/login`; SMS sign-in lives at `/auth/otp`. The legacy `/login?method=password` and OTP links replace themselves with the corresponding canonical route and retain safe `returnTo` destinations.
- Auth entry, recovery, policy returns, session expiration and Back fallbacks use the canonical application routes. Business/admin sign-in behavior remains supported.
- Bencho's MIT One-time code source is adapted into `@repo/ui/kit/OneTimeCode`, retaining its explanatory comments and using existing theme variables. Application codes contain five digits. Paste normalizes Persian/Arabic numerals and formatting before enforcing length.
- The API result controls pending, rejection and success. Entering five digits alone does not verify a user. Only invalid-code responses trigger rejection; transport errors preserve the code for retry.
- Route transitions use opacity/short translate3d movements: fade 120 ms, sheet 200 ms, push 220 ms. Removed the duplicate 600 ms form entrance, fullscreen slide, sheet scaling and zoom blur. Auth entry prefetches both sign-in routes. Reduced-motion behavior remains available.

## Verification

- 43 targeted tests pass: canonical/legacy routes, safe destinations, five-digit normalization, validation, Back/history, overlay dismissal and fullscreen navigation.
- UI and application TypeScript checks pass. Changed-file ESLint checks pass.
- Protected-design check passes for 59 shared files; `git diff --check` passes.
- Chrome mobile viewport: `/auth/login` shows the password form and its method link opens `/auth/otp`, which shows the SMS form without the password field.
- Browser checks confirm a full code stays unverified until an API result, pending disables the input, and an invalid-code response triggers rejection.
- An isolated harness using the actual component confirms formatted Persian paste, pending, rejection clearing/reset and the verified capsule. The render counter stays unchanged after success settles, confirming the animation loop parks. Harness server and viewport override were removed after checking.
- Screenshot: [OTP route](auth-routes-bencho/otp-route.jpg).

These checks do not send an additional real SMS or change account credentials. Earlier service verification is recorded in `luma-auth-2026-10-18.md`. This pass does not include a production/native build or frame-rate profiling. Development route compilation can still delay the first navigation independently of animation duration.
