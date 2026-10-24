# Luma complete screen pass

Implementation base: `821905d` (previous verified release). User request: finish the Luma redesign for every application, business and administration screen without stopping at shared-family styling. Sports, reservations, coaching, finance and access behavior remain functional.

## Acceptance

- All 112 real route exports have an explicit view mapping in the local-only `/qa/routes` canvas, using the same product components and props. Legacy login and query-shell aliases are identified, not counted as new features.
- Every route is rendered and inspected; record its actual evidence separately from state and interaction checks. A shared CSS rule or an inventory row alone is not screen acceptance.
- Authentication is a focused entry flow on all three surfaces. Chat has compact identity headers, readable message groups and anchored composition; details separate information and members. Editor forms use focused sheets where appropriate. Confirmation and receipt screens communicate result and recovery.
- Club and coach details use inset covers, compact metadata and clear actions. Lists, settings, coaching, training and operational panels share grouped surfaces, typography and spacing while retaining their domain controls.
- Application route motion explicitly covers every route family with 120/220/200 ms semantic transitions. Sheets support keyboard dismissal, focus restoration, native Back in existing wrappers and grabber drag without dismissing scrolling content or bypassing a pending-command guard. Reduced motion disables unnecessary movement.
- Persian/RTL and English/LTR, both appearances, phone and desktop widths, loading/error/empty/denied/pending/result states are checked. Record exactly which combinations and interactions were exercised.
- No production account or catalogue reset; no new paid services or credentials; no changes to authorization, payment/capacity invariants, published program versions or private offline storage.
- Typecheck, lint, meaningful UI/navigation regressions, protected-design baseline, existing API/database CI, four builds, deployment verification and Android packaging complete before delivery.

## References

Primary: the user's 393 local September 2026 Luma iOS screens, surveyed in `.artifacts/luma-all-screens/reference-01.jpg` through `reference-20.jpg`. Authentication 3–20; agenda 21–32; detail/registration 33–92; profile 93–108; editors/host/reception 109–247; chat 248–261 and 290–327; discovery/map 264–289; settings/account/receipt/notification/support 328–392.

Observed free-registration flow: https://mobbin.com/flows/dc9085b2-fae1-48f7-a5be-ebafa1af2757 . The screenshots and playable recording inform sheet/registration/result behavior. Assets and Mobbin credits are not shipped. Training and administrative domain screens adapt Luma patterns to actual Gym4Me features. No claim of mathematically identical iOS native gesture physics or physical-device verification is implied by browser evidence.
