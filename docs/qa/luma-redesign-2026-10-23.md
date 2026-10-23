# Luma redesign verification — 23 October 2026

Source before this delivery: `5f6942a1ba4fcacb403e5901221d3d02ae37d517`.
Scope: [approved redesign plan](../product/luma-redesign-plan.md).

## Delivered implementation

| Family                        | Shared implementation                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schedule and navigation       | Three persistent tabs, account avatar, date-grouped reservations, current workout, QR shortcut, retained deep links                                    |
| Discovery and club profiles   | Horizontal poster recommendations, compact club rows, image-led club detail, shared save actions and comparison                                        |
| Service and registration      | Graphic fallback for missing covers, grouped service details, session-selection Sheet, capacity/resource states, unchanged checkout commands           |
| Booking, payment and ticket   | Quiet receipt groups, compact booking rows, neutral actions, deliberate cancellation slider and equivalent button                                      |
| Profile, settings and privacy | Grouped surfaces, colored icon tiles, consistent Back behavior, existing account/privacy controls                                                      |
| Training and collaboration    | Shared controls, cards, tabs and chat treatment; workout versioning and offline synchronization retained                                               |
| Business and administration   | Shared desktop sidebar, mobile three-item dock, complete navigation Sheet, consistent management controls and analytics                                |
| Reception                     | Compact participant rows and action Sheet; camera QR reader with native detection or lazily loaded local decoder; existing authorized check-in command |

Brand, Persian/RTL and English/LTR, both themes and existing service permissions are retained. Neutral primary controls use a dedicated brand accent for sporting identity. The new source inventory is `luma-route-inventory.json`; sharing a component is not a claim that every route received a separate manual interaction test.

Filter preferences are session-only and scoped by API, application, account, route and organizational scope. Logout/login/session reset clears them, including recovery when browser storage temporarily denies access. Tokens, chat contents and private media are not put in this preference store. Camera frames are capped to 640 pixels for fallback decoding, at most four reads/second; frames are neither uploaded nor persisted. Camera tracks stop on close, hidden document and component disposal.

The sports workspace now delegates reception, members, payments, reports and imports to separate modules. No database reset or migration was needed. The training summary adds the athlete's own assignment ID so starting the current plan can use its direct route; older responses still have a safe training-page fallback.

## References and design ownership

The primary reference is the user-provided `Luma ios Sep 2026` folder. All 393 PNGs were indexed; overview samples and full-size representative agenda, discovery, registration, host and settings images were inspected. The folder contains still images, so matching unobserved native animation physics is not asserted.

12ui produced two additional sports reference screens and three HTML reference pages using the existing Codex sign-in. Local receipt: `.artifacts/luma-sep2026-branch/branch/branch.complete.json`. The HTML's fixed geometry and interaction placeholders were adapted to the existing typed product, not deployed as a second application. Luma screenshots, Mobbin credit bars and the reference conversion's artwork are not shipped in the product.

The 59-file design guard remains enabled. Its intentional updates reflect the user's explicit authorization to redesign every component; the changed primitives, club cards and club detail were checked in rendered screens before recording their new hashes.

## Verification

- UI, application and API TypeScript checks passed.
- UI and application ESLint checks passed.
- 250 application/shared-API regression tests passed sequentially, including the new Tehran agenda boundaries, local preference retirement and QR encoder/decoder interoperability checks.
- Both locale consistency tests and the presentation-copy audit passed.
- API, application, business and admin production builds passed, run sequentially. The frontend builds used Webpack and low process priority.
- Browser geometry: 31 representative families at 360, 390, 768 and 1440 pixels; 124 recorded cases, no horizontal document overflow, runtime error or unresolved loading state in the retained records.
- English language switching, dark appearance and reduced-motion emulation checked on ten representative families at 390 pixels. Reduced-motion emulation was cleared afterward.
- The registration Sheet was opened and its full, available and blocked-resource states inspected. Keyboard focus exposed an old contrast defect: the prior focus fill replaced dark action backgrounds while retaining white text. Focus now overlays the existing color pair, keeping the user's no-ring preference.

Local browser evidence (not committed/generated product assets): `.artifacts/luma-redesign-qa/`, including `layout-matrix.json`, settings, discovery and session-sheet captures.

Physical-device camera, native background gesture physics, real payment and real SMS are not claimed by these browser checks. Provider configuration remains unchanged. Publication/CI and Android delivery are recorded in the release addendum after their exact source revision is verified.

## Independent review and corrections

Three independent read-only reviews compared the implementation with `5f6942a`: standards/maintainability, approved scope, and security. The first two found the same preference-key collision and discovery deep-link precedence issue; the scope review also identified missing final host/admin session cancellation confirmation. All three were corrected and re-reviewed. Security review found no actionable issue in either the implementation commit or the final corrective delta.

Management preferences now require a distinct list identity as well as account/route/organization scope. Explicit discovery categories receive separate category/page preference contexts. Host/admin cancellation reviews a snapshot of the reason and revision in a final Sheet, then calls the original server command; failures stay visible and retries preserve server protection. Authoritative account denial also retires a stale avatar and preference owner while transient outages retain recoverable state.

Each of the 112 route inventory entries now maps to a source pattern, required state contract, and representative verification family. These state contracts are requirements, not a claim that each route/state was independently interacted with. The layout matrix records geometry only; ten 390-pixel records were subsequently refreshed in English/dark/reduced motion, with the other retained records in Persian/light. Persian/light was restored after these checks. Reservation cancellation was opened and its preview, accessible alternative and close action inspected without issuing a mutation from the read-only fixture.

The 12ui branch used the existing Codex sign-in and incurred no new API purchase. Its separate automatic alignment operation requires a hosted API operation; that paid path was not run. Source-to-rendered alignment was reviewed locally instead. Static reference images do not establish exact native motion physics.

After corrections, UI/application TypeScript and ESLint, presentation copy, workspace dependencies, the 59-file guard and 12 focused regression checks passed again. Full database/native acceptance and final publication are reported against the release revision below.
