# Gym4Me

A pnpm/Turborepo workspace with four Next.js applications, a NestJS API, and shared Persian-first UI infrastructure.

## Product documentation

The Persian [product documentation](docs/product/README.md) covers the concept, all 16 feature modules, 22 user flows, delivery phases, and an implementation checklist. Start with the [roadmap](docs/product/roadmap.md) and [task backlog](docs/product/backlog.md) to see what exists and what remains.

## Run

Requires Node.js 24+ and pnpm 11.25.0 (declared in `packageManager`).

```sh
pnpm install
# First setup only; preserve an existing apps/api/.env.
cp apps/api/.env.example apps/api/.env
pnpm db:up
pnpm db:migrate
pnpm dev
```

| Workspace   | URL                   |
| ----------- | --------------------- |
| application | http://localhost:7081 |
| admin       | http://localhost:7082 |
| business    | http://localhost:7083 |
| website     | http://localhost:7084 |
| api         | http://localhost:7088 |

`pnpm dev` starts all five services. To start one, use `pnpm --filter application dev` (or `admin`, `business`, `website`, `api`). Production uses `pnpm build` followed by `pnpm start`.

`website` is the public landing site. Its three reference-based landing sections use shared Persian/English i18n, the app theme/font, and keyboard/touch navigation. The clubs rail renders two shared `ClubCard`s per view. See [website setup](apps/website/README.md).

The application, admin, and business frontends forward `/api/*` to the API while preserving the prefix, defaulting to `http://localhost:7088`. Set `API_URL` to a different API origin at frontend build/dev time. All endpoints follow `/api/v1/{domain}/{feature}` with optional actions or related resources. `/api/v1/system/health` checks liveness; `/api/v1/system/health/ready` verifies PostgreSQL and migrations. Swagger is at `/api/v1/system/docs`. See [API setup](apps/api/README.md) and [route conventions](docs/api-conventions.md).

```sh
pnpm check-types
pnpm lint
pnpm test
pnpm --filter api test:e2e
```

## Shared packages

- `@repo/i18n`: `next-intl` request configuration, messages, locale validation, and locale providers. The default is `fa` with RTL; `en` uses LTR. Admin/business persist selection in the `gym4me-locale` cookie. Application uses local storage so switching also works offline in the native bundle. URLs stay unchanged. There is no locale route segment, proxy file, or middleware file.
- `@repo/theme`: the CLI-applied `b1VoQUO8` preset (Radix Luma, neutral charts, large radius), with the supplied spring-green palette replacing lime, semantic CSS tokens, `next-themes`, IranSansX, and Sandow font assets.
- `@repo/ui`: all 61 source components available from the preset's `shadcn add --all`, plus the Sandow icon factory. Legacy `form` is an empty entry in this registry version; use `Field` with your form library. Data tables and date pickers are compositions of the included Table/Calendar/Popover components.

## Components

Import individual entrypoints to keep dependencies focused:

```tsx
import {
  Button,
  type ButtonProps,
  type ButtonVariants,
} from "@repo/ui/kit/Button";
import { BarbellHorizontalIcon } from "@repo/ui/icons";

<Button variant="outline">
  <BarbellHorizontalIcon data-icon="inline-start" />
  شروع تمرین
</Button>;
```

Every kit folder contains `Name.tsx`, `Name.styles.ts`, `Name.types.ts`, and `index.ts`. Styles live in CVA definitions and use theme tokens. The types module exports the public props and variant types. Compound primitives stay together (for example, Card, CardHeader, and CardTitle).

The shared `components.json` records the official registry and preset configuration. To update upstream components, use the shadcn CLI's `--dry-run` / `--diff` and merge into the existing folders. The CLI's default flat, kebab-case output needs to be adapted to this repository's PascalCase structure; do not overwrite the split modules blindly.

Product app global CSS imports `@repo/theme/globals.css`, `@repo/theme/icons.css`, and explicitly scans `packages/ui/src` for Tailwind classes. Theme, locale, direction, tooltip, and toast providers are installed in the application, admin, and business root layouts. Request-based locale selection intentionally uses ordinary dynamic rendering rather than Cache Components. The public website retains reference-based section layouts while sharing the app’s font, theme tokens, locale, and direction providers.

## Fonts

IranSansX is self-hosted through `next/font/local` from the supplied variable WOFF2. It supports weights 100–1000 and applies `font-variation-settings: "DOTS" 4` without overriding the weight axis. It replaces the preset's Inter font.

All 1,078 supplied Sandow duotone SVGs are retained in `packages/theme/assets/sandow`. The generated WOFF2 contains 3,725 layers. Named React icon components overlay glyphs in the original paint order and opacity; their color inherits from the surrounding semantic text color. Icons are decorative by default; pass a localized `label` to standalone meaningful icons, or label the containing button. The icon font does not inherit IranSansX variation settings.

The generator normalizes strokes, clips, transforms, and even-odd fills with picosvg before converting outlines to TrueType. Codepoints are stable in the committed `sandow-codepoints.json` manifest. Assets are committed, so Python is only needed when changing icon sources:

```sh
python3 -m venv .venv-fonts
.venv-fonts/bin/pip install -r packages/theme/scripts/requirements-fonts.txt
PATH="$PWD/.venv-fonts/bin:$PATH" pnpm icons:build
pnpm exec prettier --write packages/ui/src/icons/index.ts packages/theme/src/fonts/sandow-codepoints.json
```

The font binaries and source icons are project-provided assets; their original licenses remain applicable.

## Theme and page transitions

The exact spring-green 50–950 colors are exported as CSS variables and Tailwind utilities (`bg-primary-500`, `text-spring-green-700`). Semantic primary uses shade 500 in light mode and 400 in dark mode, with shade 950 foreground text.

`AnimatedThemeToggler` in `@repo/ui/kit/AnimatedThemeToggler` implements the supplied Magic UI circular reveal with the View Transition API and `next-themes` persistence. It also accepts `variant` (circle, square, triangle, diamond, hexagon, rectangle, star), `duration`, and `fromCenter`. Reduced motion and browsers without View Transitions switch immediately.

The application, admin, and business apps use [SSGOI](https://ssgoi.dev/docs) through `@repo/ui/page-transitions`. The home training card and `/training` detail demonstrate the [Airbnb-style zoom](https://ssgoi.dev/showcase/air-bnb) in both directions; other routes use a fade. For additional shared elements, match `data-zoom-exit-key` on the source with `data-zoom-enter-key` on the destination and add the route pair to the shared config. Reduced motion disables these animations.

## Android and iOS

Capacitor packages `application` as **Gym4Me**, identifier **com.gym4me.app**. Both native projects live under `apps/application/android` and `apps/application/ios`. The bundle is local, with no remote `server.url`; Next server features remain in the web apps/API. Native locale switching uses local storage, Android back navigation is wired, and the status bar follows the theme. Layouts account for safe-area insets.

```sh
# Set an HTTPS API base URL including /api/v1.
# Shared health UI requests <base>/system/health/ready.
# This is public build-time configuration, never a place for secrets.
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 pnpm mobile:sync

# Open the generated projects in their IDEs.
pnpm mobile:android
pnpm mobile:ios

# Build the Android debug APK after syncing. Requires Java 21 and Android SDK 36.
pnpm --filter application native:apk
```

`pnpm mobile:build` only creates the static bundle in `apps/application/.next-native`; `pnpm mobile:sync` rebuilds it and copies it into both projects. Run sync after changing web code or public environment variables. Without an API URL the bundle still works offline, but API features are unavailable. The API's default CORS origins include `capacitor://localhost` (iOS) and `https://localhost` (Android); preserve these if overriding `CORS_ORIGINS`.

Android debug output is `apps/application/android/app/build/outputs/apk/debug/app-debug.apk`. If Java 21 isn't the default on this Mac, prefix the build command with `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME="$HOME/Library/Android/sdk"`. `native:aab` builds a release bundle; configure release signing in Android Studio before distribution. Signing credentials and keystores belong outside version control.

iOS uses Swift Package Manager. Install full Xcode (the standalone Command Line Tools are insufficient), open `apps/application/ios/App/App.xcodeproj`, select the signing team, then Product → Archive to export a signed IPA. Native projects currently retain Capacitor's default launcher/splash artwork; replace these before store distribution.

## Club discovery

`/` and `/discovery` show the reusable `@repo/ui/kit/ClubCard`. Cards open `/discovery/clubs/:clubId` with SSGOI shared-image zoom transitions, including reverse navigation. `ClubCard` and `ClubDetail` follow the split component/styles/types/index structure and use semantic theme variables. Photo selection is shared across the card and detail page to keep the transition image consistent.

The sample catalog (`atlas`, `forma`, `pulse`) lives in `apps/application/lib/clubs.ts`; these IDs are statically generated for Capacitor. Replace this fixture with catalog data and update `generateStaticParams` when connecting the API. Unknown IDs return not found. Photos are locally bundled, AI-generated illustrations. Saved clubs and personal visit plans persist on the current device. Visit planning does not create a reservation or contact a club. Web sharing uses the current site origin; native sharing requires `NEXT_PUBLIC_SITE_URL` at export time.
