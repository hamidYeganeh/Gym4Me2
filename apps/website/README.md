# Website

Public landing app, generated with `npx create-next-app@latest` (Next.js 16.4.3, React 19, TypeScript, App Router, Tailwind CSS 4).

From the monorepo root:

```sh
pnpm install
pnpm --filter website dev
# http://localhost:7084

pnpm exec turbo run build lint check-types --filter=website
pnpm --filter website start
```

The root `apps/*` workspace includes this app automatically. It uses shared `@repo/typescript-config`, `@repo/i18n`, `@repo/theme`, and `@repo/ui`; the existing Turbo tasks run its `dev`, `build`, `start`, `lint`, and `check-types` scripts. Build output uses the existing `.next` cache rules. Port 7084 avoids the other apps.

## LandingClubsSection

`src/components/LandingClubsSection` exports the reusable section and its `LandingClub` / `LandingClubsSectionProps` types. It recreates the hero from [Nova](https://nova-template.modulify.website/), including the photographic background, typography, preview rail, expanding preview transition, progress indicator, and slide counter. Only the requested hero and its navigation are implemented.

```tsx
import { LandingClubsSection } from "@/components/LandingClubsSection";

<LandingClubsSection items={clubs} autoPlay={true} interval={5250} />;
```

Each item supplies `id`, `title`, `titleLines`, `region`, `description`, `coordinates`, `image`, `thumbnail`, `href`, and a shared `ClubSummary` in `club`. The defaults reuse the application's five illustrative club fixtures and optimized WebP photography. These fixtures are not live catalog results. Supply localized production items when a public catalog is connected. Empty input renders nothing; a single item stays stationary.

- The preview rail renders the shared `ClubCard`, with **two cards per view**, including mobile. Selecting a card updates the featured club.
- Previous/next arrows wrap; arrow keys and backdrop swipes work in both reading directions.
- Autoplay pauses on hover, focus, hidden tabs, or reduced-motion preferences. The counter toggles playback.
- The shared Gym4Me navigation links to the four sections and includes language and theme controls.

## Shared language and appearance

The website uses `ClientLocaleProvider`, `ThemeProvider`, `DirectionProvider`, and the same IRANSansX font, green brand accents, surface colors, radii, and light/dark tokens as the application. Persian/RTL is the default; English/LTR and theme choices persist through the existing shared providers. There is no separate website locale store or palette.

All section headings, default data labels, reviews, phone-screen copy, controls, empty states, and accessible instructions live in `Website` inside `packages/i18n/src/messages/{fa,en}.json`. Existing `Preview`, `Clubs`, and `Metadata` messages are reused. Numbers and durations follow the selected locale. Persian headings animate intact lines to preserve joined letters. The shared copy guard now includes `apps/website/src`.

Custom `items` are presentation data: callers supply their already-localized values. Reference poster artwork and WebGL fallback imagery retain any text baked into those images.

## LandingClassesSection

`src/components/LandingClassesSection` exports the reusable section, `LandingClass`, and `LandingClassesSectionProps`. The fan composition comes from [Stream Showcase](https://stream-showcase-template.modulify.website/); the contents now use the real shared `ClassCard` and illustrative fitness classes. Each item extends `ClassSummary` with a slug, description, and tags. All default copy is catalog-backed in Persian and English.

Drag/swipe or use arrow keys, Home/End, Enter and Space to browse, open details and pause. The native dialog describes the class, identifies it as an example, and links to the download section. Escape/backdrop/close dismiss it and restore focus. Autoplay pauses for hover, focus, hidden/offscreen state, reduced motion, and open details. Use `showNavigation={false}` when providing shared navigation, as the main page does.

## LandingDownload

The [Crema](https://crema-template.modulify.website/) phone composition now previews Gym4Me: club discovery, fitness classes, and a training agenda. It uses shared fonts, colors, icons and translations. The screen's DOM matrix is projected from the GLB's actual `Screen_BG` bounds with the same camera/pivot as the phone, so its bezel alignment survives rotation and resizing. WebGL failure falls back to the localized screen in a CSS phone frame.

Three generated matte charcoal gym objects replace the food props. Original alpha PNGs live in `public/download/gym-3d/`; Next Image optimizes the runtime versions. The built-in image generation prompt set is saved in `public/download/gym-3d-prompts.json`. The GLB, mask, and store icons retain their original provenance in `public/ASSETS.md`.

Drag the phone, use arrow keys to switch previews, or Space to pause. Reduced motion changes previews immediately. Store links are configurable via `appStoreHref` and `googlePlayHref`; defaults lead to the store homepages until production app links are supplied.


## Sticker peel footer

`LandingFooter` follows the supplied sticker-collage specification: a rounded sheet revealed beneath the preceding content, three pill-labelled columns, six CSS/SVG stickers, and a staggered Gym4Me wordmark. Colors, typography and radii use the shared theme variables. Footer copy is localized under `Website.footer`; links lead to the existing clubs, locations, classes and download sections.

A ResizeObserver enables the fixed reveal only when the full footer fits the viewport. Taller stacked layouts remain in normal flow so their content stays reachable. Keyboard focus reveals covered links, the mobile dock yields to the footer, and reduced motion disables letter and sticker transforms. No new library, remote font, placeholder contact information or social destination is added.

## Assets

All hero photography, fonts, and control SVGs are stored locally in `public/`; there are no image or font hotlinks. See [asset sources](public/ASSETS.md). The reference template and asset licenses remain applicable.

Visual verification is recorded in [design-qa.md](design-qa.md). Screenshots are local QA artifacts under `.artifacts/website/` at the repository root.

## Luma style follow-up

Mobbin references informed quieter headings, muted metadata, monochrome pill buttons, rounded grouped surfaces and a compact mobile navigation dock. App tokens come from `@repo/theme` and `@repo/ui/luma-system.css`; the actual app's Luma screen styles were also inspected. Reference screens are inspiration, not shipped page assets:

- [Luma city discovery](https://mobbin.com/screens/ff217eba-443e-4ed5-b4d8-fae280bbfe6f)
- [Luma dark discovery](https://mobbin.com/screens/f8896c4c-e3e2-40e4-bb4f-4b02852abe31)
- [Luma onboarding](https://mobbin.com/screens/f8b9c208-0980-466d-a9f3-696fb4cd6876)

The clubs rail continues to show two real shared ClubCards. The website supports Persian/RTL and English/LTR with persistent theme/language preferences. See `design-qa.md` for verification and intentional changes from the original templates.


## Location cards

`LandingLocationsSection` uses the shared `LocationExplorer` and `LocationCard` for three linked carousels: provinces, cities in the selected province, and neighborhoods in the selected city. Changing a province or city refreshes its descendants. Cards show distinct publicly discoverable club counts from the catalog; several branches of one club count once in each relevant location. Hidden clubs, unapproved organizations, and incomplete or archived branches are excluded.

Signed-in visitors start with their account's saved province/city; choosing a card updates that preference through `/api/v1/profile/account/location`. Guests receive a randomized, coherent hierarchy that stays stable while browsing. Loading, empty, and retry states are localized. The application discovery page uses the same explorer, updates club filters on selection, and keeps its searchable, paginated location picker.

Set `API_URL` to the backend (default `http://localhost:7088`) and `AUTH_WEBSITE_ORIGIN` on the API to the website origin (default `http://localhost:7084`). The website proxies catalog requests and only the account-location endpoint; the shared application session identifies signed-in visitors. The API retains authentication, consent and origin checks. Apply migration `0040_account_locations.sql` before running this feature against an existing database.

Known places receive locally bundled photographs; unknown places receive a neutral map-pin fallback. No prices, ratings, or distances are invented. Photo credits are linked from both surfaces.
