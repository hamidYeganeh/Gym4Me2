# Sticker collage peel footer

Date: 2026-10-24. Source: the user's pasted Sticker Collage Peel Footer specification. Its live Cue URL returned a 404. The implementation follows the reveal architecture, rounded sheet, three pill-labelled columns, six CSS/SVG stickers and staggered letter animation. Gym4Me theme colors, existing typography, brand wordmark, localized copy and real section links replace the template palette, agency contact placeholders and social labels.

Desktop uses a fixed sheet beneath the opaque content with a matching measured scroll runway. When the stacked footer is taller than the viewport it stays in normal flow, preserving access to all content. Covered footer links reveal themselves on keyboard focus, and the mobile navigation dock hides while the footer is visible. The collage uses `overflow: clip` to avoid a hidden internal scroll container shifting the content after keyboard focus or viewport changes.

Browser checks covered 375×844, 600×900, 900×900, 1024×768, 1280×720 and 1440×900; no horizontal document overflow was observed. Verified the partial peel, completed letter reveal, keyboard access, back-to-top and section links, Persian/English layout, light/dark colors and reduced-motion CSS. Website types, targeted lint, i18n parity, copy guard and production build passed. The production preview was reloaded for the final check. Evidence is under `.artifacts/website/footer/`.

The 12ui draft attempt was interrupted before returning candidates; its temporary run artifacts were not retained across that interruption. No generated candidate, comparison kit or automated fidelity result is claimed. The supplied text/CSS specification and direct browser review are the design evidence for this footer.

---

# Portrait ClubCard and fitness illustrations follow-up

Date: 2026-10-24. The shared portrait ClubCard now uses the user's full-photo reference, theme variables, translucent price/saved controls and an existing preview/discovery action. The two visible club previews remain usable at desktop and phone sizes. The location section includes a FitnessNote using the user's unmodified treadmill illustration and its existing Download destination; empty class content uses the shared kettlebell illustration.

Website type checks, targeted lint, i18n parity/copy guard and the production build passed. Browser review checked Persian desktop and English mobile cards, complete image bounds, preview selection and the note's Download link. Manual evidence is in `.artifacts/club-card/` and `.artifacts/fitness-illustrations/`. The 12ui improvement attempt was blocked by its exhausted free allowance and prepaid-wallet requirement; no candidate or automated fidelity result was returned. See [shared implementation and validation notes](../../docs/calendar-and-card-ui.md).

---

# Luma styling, shared ClassCard, and gym mockup follow-up

Date: 2026-10-24. Build, lint, types, copy guard, and i18n parity checks passed.

This follow-up supersedes the reference content and visual choices recorded below. Mobbin Luma city/discovery/onboarding screens and the application's existing Luma styles informed typography, muted metadata, pill controls, grouped surfaces, and mobile dock navigation. Application fonts, tokens, icons and shared components remain authoritative.

## Current implementation

- Clubs retain two visible shared `ClubCard` previews at all tested widths.
- The class fan renders the actual shared `ClassCard`, with fitness title, coach, level, calories, duration and points. Its trigger is a sibling overlay button, avoiding nested buttons or a block card inside a button. Illustrative class details replace the old founder podcast/YouTube experience; a native dialog supports Escape, focus restoration and an app link.
- Download previews show Gym4Me club discovery, class details and an agenda. Coffee copy, product photos, food props, invented testimonials, membership totals and reference ratings are removed from the rendered section.
- Three matte charcoal fitness objects were generated with built-in `image_gen`: dumbbell, kettlebell and bottle. All originals preserve alpha. They are saved under `public/download/gym-3d/`; runtime Next Image variants loaded successfully at 256px. Exact prompts are in `public/download/gym-3d-prompts.json`.
- The display overlay is derived from the GLB's actual `Screen_BG` mesh bounds. Its CSS matrix uses the same camera projection and phone pivot as WebGL, replacing guessed width/height/depth factors. The projection updates during rotation and resizing. Props and the small feature card sit above the screen in the intended layer order.
- The phone fallback renders the localized UI in a CSS frame. The fallback was code-reviewed; a forced WebGL failure was not part of this browser pass.

## Verification

- Production build, website lint/type checks, shared i18n tests (2), and catalog copy guard passed.
- Browser checks covered 320×844, 390×844, 768×900, 1046×804 and 1280×800. No document horizontal overflow was observed. Exactly two club previews are marked visible; remaining rail items are hidden and inert.
- Visually checked phone/frame alignment in Persian dark and English light modes, along with the generated alpha props, complete mobile phone composition, shared ClassCard fan and class detail dialog.
- Verified keyboard Enter opens class details, Escape closes them, navigation returns to the selected card, and phone arrow navigation changes scenes immediately under reduced motion. The reduced-motion override was removed afterward.
- Confirmed locale changes update HTML language/direction and phone/class content. Checked the light theme against the dark theme. Captured console warnings/errors were empty.
- Screenshot evidence is in `.artifacts/website/luma/`: desktop clubs/classes/download, mobile classes/download, and English light download.

## Design closeout

12ui target-based kits settled in `/tmp/gym4me-luma-{clubs,classes,download}-closeout`. Each README, token patch and annotated plan was reviewed. They are image-input, target-only **unanchored** kits, not a pixel-match certification; no recurring token deltas were reported. The city reference conversion completed as `d63f91d3-4e11-4e36-aa37-8807cbb6c6ef`. The second dark-discovery conversion ended with a temporary service failure, no charge, ID `b1147c8f-f140-4c8a-8bf8-18d6ea8e708b`; the original screenshot was still inspected directly.

The user explicitly requested the app style, shared cards and new fitness assets. Accordingly, the Luma city photo/event thumbnails/branding, Stream movie posters and Crema room/food imagery specified by the original targets are intentionally not restored into the current UI. The shared Gym4Me imagery, generated props, actual cards, localized copy and quieter app tokens implement that requested change. Historical source files and target artifacts remain available. The visual review retained the fan and rotating phone compositions while checking the requested replacements at desktop/mobile sizes.

---

# Shared i18n, app styling, and ClubCard follow-up

Date: 2026-10-24. Current result: passed.

This follow-up supersedes the original reference styling/counts documented in the historical QA below. The requested changes intentionally replace template typography/palettes with the application's visual system, translate the sections, and show two shared ClubCards.

## Implementation and checks

- Website imports `@repo/i18n`, `@repo/theme`, and `@repo/ui`; uses their locale/theme/direction providers, IRANSansX, theme tokens, logo, icons, and appearance control.
- Persian/RTL and English/LTR cover headings, instructions, controls, default class/episode data, numbers/durations, reviews, store labels, and the decorative phone screen. A React phone preview replaces the unlocalized iframe at runtime.
- The clubs rail uses the real shared `ClubCard`, two cards at a time. It reuses the application's five illustrative club fixtures and optimized WebP images. These are preview data, not live catalog results.
- Language and theme switches update the sections and survive reload. Persian headings retain joined letters. Carousel directions and the class fan mirror for RTL.
- Verified shared-card selection, previous/next, Persian class keyboard navigation and dialog details, English mobile menu/dialog, phone scene keyboard navigation, and reduced-motion behavior. Light-mode controls and overlay heading contrast were corrected.
- A final RTL mobile check found the fan's center card inherited the RTL static position. Explicitly anchoring the absolutely positioned card at `left: 0` fixed it. At 390px the active card center now measures exactly 195px.
- At actual CSS widths 320, 390, 768, 1146, and 1280 there is no document horizontal overflow, with two visible club cards. Mobile club cards stay visible and stack below hero copy rather than disappearing.
- Production build, lint, type checks, shared i18n parity tests, and the expanded copy guard passed. Fresh production browser verification logged no warnings or errors. Production preview runs on port 7084.

## Evidence

Current evidence lives under `.artifacts/website/i18n/`:

- `clubs-dark-fa-desktop.png`, `clubs-dark-fa-mobile.png`
- `classes-dark-fa-desktop.png`, `classes-dark-fa-mobile.png`, `classes-dialog-dark-fa-desktop.png`
- `download-dark-fa-desktop.png`, `download-dark-fa-mobile.png`
- `*-light-en-desktop.png` captures document the English/light adaptation.

Desktop captures use 1280×800; phone CSS viewports use 390×844. Where the host browser raster did not follow emulated dimensions, full-document captures were cropped at measured section boundaries with no rescaling. Fixed skip-link/focus artifacts in full-page phone captures were checked against the DOM/viewport and are not content within those sections.

Completed 12ui target closeout kits for each original approved LayerDoc are saved under `design-review/` within that evidence directory. All stages settled without a new conversion. These are target-only, unanchored plans, with no matched-node or recurring token changes; they do not independently certify fidelity. Existing source artwork is retained for classes/download, while the user's requested shared club cards, app assets, theme, typography, and translations intentionally supersede the original template treatments. Browser evidence supplies the final verification.

Reference artwork can contain baked-in English text; the fallback poster and custom caller-supplied data are not automatically translated. Store links, template video IDs, and source navigation destinations retain the limitations described in README. No additional backend, auth flow, store listing, or publishing was requested.

---

# LandingClubsSection visual QA

Date: 2026-10-24

## Result

No remaining actionable P0/P1/P2 visual findings in the requested hero.

final result: passed

## Evidence and normalization

Source visual truth: https://nova-template.modulify.website/ — initial Matterhorn slide, captured in the Codex in-app browser. The source DOM, styles, fonts, control SVGs, images, and responsive rules were also inspected.

Evidence is stored at the repository root in `.artifacts/website/` (ignored local verification output):

| Evidence                | Path                            | CSS viewport / raster size   |
| ----------------------- | ------------------------------- | ---------------------------- |
| Desktop source          | `reference-desktop.png`         | 1280 × 720 / 1280 × 720      |
| Desktop implementation  | `implementation-desktop.png`    | 1280 × 720 / 1280 × 720      |
| Desktop side-by-side    | `comparison-desktop.png`        | 2560 × 720 composite         |
| Focused copy comparison | `comparison-type.png`           | Two matching 480 × 480 crops |
| Phone source            | `reference-mobile.png`          | 390 × 844 / 390 × 844        |
| Phone implementation    | `implementation-mobile.png`     | 390 × 844 / 390 × 844        |
| Phone side-by-side      | `comparison-mobile.png`         | 780 × 844 composite          |
| Tablet implementation   | `implementation-tablet.png`     | 768 × 1024                   |
| Transition evidence     | `implementation-transition.png` | 1280 × 720                   |

Both sources and implementations use a 1:1 capture density; no image rescaling was needed for comparison. The initial desktop and phone states were paired in the same comparison image and opened for visual review. The focused desktop crops were compared to check small text, CTA spacing, heading wrapping, and coordinates.

## Required fidelity surfaces

- **Typography:** The original Inter and Archivo WOFF2 assets are self-hosted. Display weight, title size/line height, line breaks, body copy, uppercase tracking, card titles, and numeric counter align with the source.
- **Spacing/layout:** Matches the source's full viewport, centered text block, clamped outer margins, 48px controls, 20px card corners, measured desktop rail, and bottom progress/counter. Phone cards disappear at the source's 900px breakpoint. Additional 320 × 640, 768 × 1024, and 1440 × 900 checks showed no horizontal overflow and kept controls in the viewport. The wide layout displays four previews as the source's sizing formula specifies.
- **Colors/tokens:** Copper accent `#cd8f5d`, white text opacities, photographic scrims, card gradients, borders, and the top navigation gradient match the captured source.
- **Image quality/assets:** Uses the exact source photographs at 2400px for backdrops and 640px for previews, with the source's cover crop and 1.08 backdrop scale. Original SVG controls are local files. No visible source image was approximated with generated artwork or CSS drawings.
- **Copy/content:** Preserves all ten reference destinations, descriptions, region labels, coordinates, preview titles, navigation labels, and Discover location text. Defaults are explicitly identified as reference content in the data module and README.

## Interactions and browser verification

Verified against the production app at http://localhost:7084/:

- Previous/next and first-to-last / last-to-first wraparound.
- Direct preview-card selection and restoration of the previous slide.
- Left-arrow keyboard navigation while the carousel is focused.
- Horizontal pointer drag on the phone layout.
- Expanding-card animation, copy transition, updated counter, and progress bar.
- Autoplay advancement after focus leaves the carousel; counter playback toggle.
- Reduced motion: instant manual navigation with zero transition layers; automatic advancement is suppressed.
- Preview rail hidden on phones/tablets; expected count on desktop.
- Production browser console: no errors or warnings in the fresh verification tab.

Navigation and Discover links retain their original Nova destinations, as documented in the app README. No additional pages were requested or created.

## Comparison history and intentional differences

The starter's broad Tailwind Turbopack rule initially removed CSS Module exports. This was caught during browser verification and corrected by limiting the loader to `globals.css`; the resulting styles were checked in both the rendered page and DOM. Source comparisons were performed after that correction.

The final transition review corrected numeric animation dimensions to explicit pixel values and hides the promoted preview while its image expands. Production verification confirmed navigation and transition completion after the fixes.

The paired desktop and phone reviews found no further P0/P1/P2 mismatch requiring a visual change. The third-party "Edit with Modulify" badge is omitted; the slide counter also serves as an accessible playback toggle. Neither changes the requested hero composition. A development-only Next indicator present in an earlier capture is absent from the final production preview.

## Engineering checks

`pnpm exec turbo run lint check-types build --filter=website` passed. Turbo discovered the app through the existing `apps/*` workspace and ran all three tasks. The build prerenders `/` as static content. The application, admin, business, and API packages were outside this change's validation scope.

## Follow-up polish

No blocking follow-ups. The section accepts typed `items` for replacing the reference destinations with real club data and links.

## Automated target closeout

The 12ui target-based closeout completed using the unchanged reference LayerDoc. Its completed kit is preserved under `.artifacts/website/design-review/`. Capture, target preparation, and plan all settled. The plan is target-only and unanchored, so it does not independently certify the implementation; the paired browser comparisons above are the fidelity evidence. Its token patch contains no recurring changes, and it reports no matched changes.

The target photographs are already carried as the original high-resolution local photographs, and the pin/arrows as the original local SVGs. These source assets were retained in preference to crops extracted from a screenshot. Original DOM-verified Archivo/Inter fonts and source gradients were retained where the inferred target specifications differed. The editor badge remains intentionally omitted. No additional visual code changes were justified by the completed closeout.

# LandingDownload visual QA

Date: 2026-10-24

final result: passed

Source visual truth: https://crema-template.modulify.website/. The section is mounted after `LandingClubsSection` and is directly addressable at http://localhost:7084/#download.

## Evidence

Evidence lives under `.artifacts/website/download/` at the repository root (ignored local QA output).

| Evidence                          | Path                         | CSS viewport / raster size          |
| --------------------------------- | ---------------------------- | ----------------------------------- |
| Desktop source                    | `reference-desktop.png`      | 1280 × 800                          |
| Desktop production implementation | `implementation-desktop.png` | 1280 × 800                          |
| Desktop comparison                | `comparison-desktop.png`     | 2560 × 800 composite                |
| Focused typography comparison     | `comparison-type.png`        | Two matching 520 × 560 crops        |
| Phone source                      | `reference-mobile.png`       | 390 × 844 / 390 × 1058 full section |
| Phone production implementation   | `implementation-mobile.png`  | 390 × 844 / 390 × 1058 full section |
| Phone comparison                  | `comparison-mobile.png`      | 780 × 1058 composite                |

Capture density is 1:1. Implementation section crops remove the preceding Nova section without rescaling. The phone proof combines copy and scene regions from two scroll positions at the same viewport and paused state, because Chromium's full-page capture omits offscreen iframe painting. Source and implementation desktop/phone captures were opened side by side. The source phone state and production phone state use the shake theme; the desktop pair uses the donut theme. The animated source pose can differ slightly from the implementation's settled pose.

## Fidelity and behavior

- Original desktop/mobile room backgrounds, food PNGs, iPhone GLB, Unsplash photographs, SVGs, Fraunces fonts, screen mask, and passive app-screen markup are served locally. No substitute artwork was generated.
- Heading character spacing, optical size, italic copper accent, body wrapping, store badges, social proof, scene dimensions, and the 880px responsive breakpoint follow source DOM measurements. The 390px section height matches the source at approximately 1059px. Additional 320 × 640 and 768 × 1024 checks showed no horizontal page overflow; narrow phone badges and rating copy remain inside the section.
- Three scene themes rotate automatically. Production-browser checks verified arrow-key selection, horizontal pointer drag, Space playback toggle, reduced-motion manual selection, and suppressed automatic motion under reduced motion. Hover/focus and document visibility also gate autoplay and rendering.
- The GLB and Three.js load near the viewport. WebGL initialization failure has a local source-poster fallback. The fallback branch is implemented but was not forced in browser verification.
- Phone controls are decorative, as in the source. Their script-free iframe is sandboxed, hidden from the accessibility tree, and excluded from pointer/tab interaction. The actual scene provides keyboard instructions, a playback control, and a manual-selection announcement while paused.
- Store links are configurable and default to official store home pages because real app listing URLs were not supplied. No app ID or product integration is fabricated.
- Fresh production browser console: no warnings or errors. Visible section images loaded successfully.

The paired visual review found no remaining actionable P0/P1/P2 discrepancy. Intentional differences are omission of the third-party editor badge, accessible playback controls, real store landing-page defaults instead of `#`, and a standard Three.js room environment for model reflections. The reference content is retained as template content, not Gym4Me claims.

## Engineering validation

`pnpm --filter website build` passed and prerenders `/` statically. `pnpm exec turbo run lint check-types --filter=website` passed. An initial combined run compiled successfully but exhausted local disk space during TypeScript output; the app's generated `.next` cache was cleared and all checks were rerun successfully. Production verification uses `pnpm --filter website start` on port 7084.

## Automated target closeout

The 12ui conversion produced a LayerDoc target from the unchanged desktop reference. The subsequent target-only improve kit completed capture, target preparation, and planning; it is saved in `.artifacts/website/download/design-review/`. The plan is unanchored and reports no matched changes, so paired browser comparisons remain the fidelity evidence. Its token patch contains no recurring deltas. Original backgrounds already include the room and leaves, so screenshot crops/cutouts were retained as QA references instead of duplicating those layers in the shipped section. The original local store SVGs were retained over inferred icons. No additional visual changes were justified by the closeout.

# LandingClassesSection visual QA

Date: 2026-10-24

final result: passed

Source visual truth: https://stream-showcase-template.modulify.website/. Implementation: http://localhost:7084/#classes, between the existing clubs and download sections.

## Evidence and normalization

Local evidence is stored in `.artifacts/website/classes/` at the repository root. All final comparisons use 1:1 CSS/raster density, without image rescaling. Implementation page captures are cropped to the classes section to remove the preceding Nova hero.

| Evidence                      | Source                                   | Implementation                      | Comparison                      |
| ----------------------------- | ---------------------------------------- | ----------------------------------- | ------------------------------- |
| Desktop hero, Deep Work       | `reference-desktop-normalized.png`       | `implementation-desktop.png`        | `comparison-desktop.png`        |
| Phone hero, Growth Engines    | `reference-mobile-normalized.png`        | `implementation-mobile.png`         | `comparison-mobile.png`         |
| Phone menu                    | `reference-menu-mobile-normalized.png`   | `implementation-menu-mobile.png`    | `comparison-menu-mobile.png`    |
| Desktop preview, Solo to SaaS | `reference-detail-desktop.png`           | `implementation-detail-desktop.png` | `comparison-detail-desktop.png` |
| Phone preview, Growth Engines | `reference-detail-mobile-normalized.png` | `implementation-detail-mobile.png`  | `comparison-detail-mobile.png`  |

The desktop hero viewport and raster are 1280 × 800; phone captures are 390 × 844. Desktop preview evidence compares equal 1280 × 720 crops from a 1280 × 800 CSS viewport because the first source capture surface exposed only 720 raster rows. Later hero captures were normalized with the browser viewport control. Early phone captures scrolled to a card were discarded from final comparisons; final source and implementation hero captures both start at section offset zero. Native visible-card clicks preserve that offset when capturing previews.

The full paired images above and `comparison-type.png` (two 480 × 640 crops covering the eyebrow, heading, badges, and card metadata) were opened for review. `implementation-transition-desktop.png` records the normal opening animation. Source episode-player evidence is recorded in `reference-player-desktop.png`.

## Required fidelity surfaces

- **Typography:** Original self-hosted Caveat Brush, variable Geist, and bold Playfair Display. The title uses the measured clamp, 0.9 line height, individual letter spacing, and source line breaks. Navigation, badges, episode labels, and modal typography match their source weights and sizes. Phone metadata wraps to the source's 33px row height.
- **Spacing/layout:** The source's viewport-height section, 64px navigation, 96px/64px copy offset, card dimensions, transform origins, 16°/10° fan angles, scaling, and 768px breakpoint are reproduced. The preview matches the source's 1200px maximum width, 92vh height, 16px corners, image crop, and horizontally scrolling episode shelf. Additional 320 × 640 and 768 × 1024 checks showed no horizontal page overflow.
- **Colors/tokens:** Matches the near-black `#0a0a0c` stage, white title, translucent eyebrow and badges, yellow rating star, inactive grayscale/opacity, source gradients, and modal backdrop. Added keyboard focus and playback states remain legible.
- **Image quality/assets:** Original five posters, five full preview images, all 34 episode thumbnails, SVGs, and fonts are local. Subject, cover crops, sharpness, and icon geometry match the source. No source artwork was replaced with generated images, CSS drawings, or approximate icons.
- **Copy/content:** Preserves the reference title, five collections, ratings, tags, chapter/video labels, episode titles, durations, and video IDs. The data module and README identify these as reference content and expose typed `items` for Gym4Me replacements.

## Comparison history and fixes

1. **P2, phone metadata wrapping:** An added nowrap rule kept chapter/video labels on one line, changing the card's vertical text position. Removed it. Final `comparison-mobile.png` and DOM measurements confirm the source's 33px metadata height and matching title position.
2. **P2, returning to the selected card:** Closing a preview could restore the carousel's earlier animation state. Restoration now runs after dialog animation cleanup and explicitly preserves the selected slot. Production checks confirmed Growth Engines remains selected after closing.
3. **Page-position and capture normalization:** Locator clicks centered cards in the viewport, introducing a false comparison offset. Final captures use visible-card clicks at a verified section offset of zero. The dialog also locks the underlying body at its current page position and restores all prior body styles and scroll coordinates on close; final checks confirmed a stationary section and restored scrolling.

No actionable P0/P1/P2 finding remains after the revised paired comparisons.

## Browser behavior and engineering checks

Verified in the production app:

- Pointer drag/fling, keyboard left/right and Home/End, and Enter-to-open.
- Normal poster flip, panel expansion, episode entrance, and completed reverse animation.
- Selected-card and focus restoration after closing; body styles/scroll lock released.
- Native dialog semantics, background inertness, close control, backdrop dismissal, Escape-to-preview and Escape-to-close.
- Episode selection, correct YouTube embed URL, selected episode state, and Back to preview. YouTube required sign-in in this browser on both source and implementation; actual media playback is provider-gated.
- Mobile menu open/close, original navigation destinations, and section-local branding anchor.
- Playback toggle and automatic advance from Solo to SaaS to Growth Engines after focus/hover left the carousel.
- Reduced motion: instant manual navigation and preview, suppressed autoplay, and successful close after changing the motion preference while a preview is open.
- Fresh production hero console: no warnings or errors.

`pnpm --filter website build`, `pnpm --filter website lint`, and `pnpm --filter website check-types` all passed on the final code. The root page remains statically prerendered. No other applications or backend services were changed or validated for this section.

Intentional differences: the editor badge is omitted; the hero navigation is contained in the section to coexist with the other heroes; cards use semantic buttons and a native dialog; accessible playback/keyboard controls are added. Source content pages and waitlist remain at their original external destinations, as documented in the README. Empty/single-item inputs are supported in code but were not separately rendered during browser QA.

## Automated target closeout

The original desktop reference was converted to a LayerDoc, then used unchanged in the completed 12ui target-only closeout. The kit is preserved in `.artifacts/website/classes/design-review/`. Capture, target preparation, and plan settled. Its unanchored plan reports no matched changes and an empty recurring token patch; it does not independently certify fidelity. Final normalized manual comparisons cover the complete hero and preview states.

Original full-resolution posters and original SVG logo/control assets were retained instead of screenshot-extracted rotated crops or inferred icons. Original DOM-verified fonts, geometry, and inactive-card treatments were retained over inferred target specifications. No additional visual changes were justified by the closeout. No blocking follow-up remains.


## Location cards — 2026-10-24

The shared LocationCard follows the supplied two-card reference: 129:153 proportions, rounded photographic covers, colored lower gradients, translucent type and action pills, optional save hearts, and overlapping club thumbnails. Website categories browse province → city → neighborhood; leaves open the existing app-download flow. Default website records are geographic examples, not a live catalog. The discovery filter picker renders the same cards over its existing remote option source. Unknown locations and failed images have a neutral map-pin fallback.

Verified in the browser: Persian/RTL and English/LTR desktop; website and application at 390px without horizontal overflow; image loading; saved-location persistence after reload; province/city drilling; neighborhood detail closing and focus restoration; application keyboard selection and parent-dependent fields; remote search finds a district beyond the first 25 results. Application checks used a disposable, read-only API fixture rather than production data. Screenshots: `.artifacts/website/locations/{website-en-desktop,website-fa-mobile,application-neighborhoods}.png`.

Validation: shared UI, website, and application TypeScript checks; lint for changed UI/website/application components; presentation-copy guard; 17 existing location, pagination, and select-source tests; 2 i18n tests; Prettier and git whitespace checks.

12ui's local conversion failed its exact-2x source-frame contract for the small reference image. The target-based alignment service then rejected conversion creation, reporting nothing purchased and producing no alignment plan. The saved kits remain under `/tmp/gym4me-location-{reference,reference-crop,alignment}-20261024`; no automated fidelity pass is claimed. Visual comparison was performed directly in the browser against the attached reference.

## Linked location carousels — 2026-10-24

This replaces the location section's sample grid and device-only saved cards described above. Both surfaces now use the same API-backed LocationExplorer: provinces, cities in the selected province, and districts/neighborhoods in the selected city. LocationCard shows a non-interactive club-count pill; the «انتخاب مکان» action is removed. Counts deduplicate clubs with several branches and use the public catalog's visibility rules.

Verified account personalization with a synthetic session against an isolated PostgreSQL database: selecting Fars on the website updated the saved preference; both website and application restored Fars after reload. Selecting an ancestor clears stale descendants. The synthetic browser cookie and temporary session were removed afterward. Guest visits use randomized, related rows, and selection keeps their hierarchy synchronized. Application filter reset succeeds without sending empty UUIDs.

Browser checks covered the application at 390×844 and the website in Persian/RTL and English/LTR at 390px and 1280px. Confirmed mobile carousel arrows scroll horizontally, all three dependent rows update, zero/nonzero counts render with locale-aware digits, images load, unknown locations use the fallback, and document width matches viewport width. The website's production build and rendered location section passed; the browser-only guest seed avoids random values during prerendering. Existing unrelated image LCP advisories remain in development.

Validation passed: website production build; API, shared API/UI, application and website TypeScript checks; lint for all changed feature sources; 21 location/client/pagination/option-source tests; 3 PostgreSQL integration tests; 2 i18n tests and copy guard; git whitespace check. The database suite was repeated successfully and removes its own fixture rows. Migration 0040 was applied twice successfully to the isolated test database.

Evidence: `.artifacts/location-carousels/{website-fa-desktop,website-fa-mobile,website-en-mobile,application-fa-mobile}.png`. All final files use native viewport captures. The desktop file shows the province carousel; mobile captures also show the dependent city row. Full-page exports were discarded because the capture tool changed the page geometry. Local previews use an isolated synthetic test catalog, not production records. Existing databases require migration 0040 and the API's `AUTH_WEBSITE_ORIGIN` configuration described in the READMEs.
