# Mobile redesign · 2026-10-22

The user explicitly authorized changes to all sections and components, including the previous protected catalog. Baseline updates in this change record intentional visual edits; the guard remains enabled. No live data is created or restored.

## Direction

- Luma: quiet section hierarchy and compact event rows. https://mobbin.com/screens/ab2c9692-bb86-45f1-90a1-8bf7cdc16db0
- Cosmos: image-led collections, restrained search and categories. https://mobbin.com/screens/1b4881ac-aafb-4348-a982-5f49a44f1e5c
- Hevy: aligned set inputs, clear completion, one workout action. https://mobbin.com/screens/7178a6f5-fe6b-4b20-9e1b-909af6cd8382
- ClassPass: concise venue information and accessible booking action. https://mobbin.com/screens/e1bffb81-52a4-439d-9ee0-b16263f987ae

References inform layout only; no third-party artwork is copied. Existing local WebP images, typography, green identity and 120/220/200 ms motion are retained. Heavy fixed blurs are removed from the changed card/detail/navigation surfaces.

## Source inventory

All 62 application route entry points inspected. Shared shell, account, kit and training updates apply across route families. This is source coverage, not a claim of 62 completed authenticated browser tests. Runtime results are recorded separately below.

| Route | Entry component |
| --- | --- |
| `/auth/login` | `import { LoginPage } from "@repo/ui/account";` |
| `/auth/otp` | `import { LoginPage } from "@repo/ui/account";` |
| `/bookings/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { BookingDetail } from "../../../components/luma/bookings";` |
| `/bookings` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { BookingsPage } from "../../components/luma/bookings";` |
| `/calendars/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { CalendarDetail } from "../../../components/luma/community";` |
| `/calendars` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { CalendarsPage } from "../../components/luma/community";` |
| `/checkout/mock-gateway` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { MockGateway } from "../../../components/luma/mock-gateway";` |
| `/checkout` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { CheckoutPage } from "../../components/luma/checkout";` |
| `/checkout/status` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { PaymentStatus } from "../../../components/luma/checkout";` |
| `/coaches/detail` | `import { Suspense } from "react";`<br>`import { CoachingDirectory } from "@repo/ui/account";`<br>`import { PageLoading } from "../../../components/luma/page-loading";` |
| `/coaches` | `import { Suspense } from "react";`<br>`import { CoachingDirectory } from "@repo/ui/account";`<br>`import { PageLoading } from "../../components/luma/page-loading";` |
| `/coaching` | `import { Suspense } from "react";`<br>`import { CoachingWorkspace } from "@repo/ui/account";`<br>`import { PageLoading } from "../../components/luma/page-loading";` |
| `/coaching/session` | `import { Suspense } from "react";`<br>`import { CoachingSessionNote } from "@repo/ui/account";`<br>`import { PageLoading } from "../../../components/luma/page-loading";` |
| `/coaching/student` | `import { Suspense } from "react";`<br>`import { StudentAssessment } from "@repo/ui/account";`<br>`import { PageLoading } from "../../../components/luma/page-loading";` |
| `/discovery/club` | `import { Suspense } from "react";`<br>`import { ClubRoute } from "../../../components/discovery/club-route";`<br>`import { CatalogState } from "../../../components/discovery/catalog-state";` |
| `/discovery/clubs/[clubId]/gallery` | `import { ClubGallery } from "../../../../../components/discovery/club-gallery";`<br>`import { getPublicClub } from "../../../../../lib/public-catalog";` |
| `/discovery/clubs/[clubId]` | `import { ClubPage } from "../../../../components/discovery/club-page";`<br>`import type { Metadata } from "next";`<br>`import { getPublicClub } from "../../../../lib/public-catalog";` |
| `/discovery/clubs/[clubId]/reviews` | `import { ClubReviews } from "../../../../../components/discovery/club-reviews";`<br>`import { getPublicClub } from "../../../../../lib/public-catalog";` |
| `/discovery/clubs/[clubId]/slots` | `import { ServicesPage } from "../../../../../components/luma/services";`<br>`import { clubHref } from "../../../../../lib/club-href";`<br>`import { getPublicClub } from "../../../../../lib/public-catalog";` |
| `/discovery/coaches/[coachId]` | `import { notFound } from "next/navigation";`<br>`import { clubIds } from "../../../../lib/clubs";`<br>`import { getCoaches } from "../../../../lib/coaches";`<br>`import { CoachPage } from "../../../../components/discovery/coach-page";` |
| `/discovery/compare` | `import { Suspense } from "react";`<br>`import { ClubComparison } from "../../../components/discovery/club-comparison";`<br>`import { CatalogState } from "../../../components/discovery/catalog-state";` |
| `/discovery/map` | `import { DiscoveryMap } from "../../../components/discovery/discovery-map";` |
| `/discovery` | `import { Discovery } from "../../components/discovery/discovery";` |
| `/documents` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { DocumentsPage } from "../../components/luma/documents";` |
| `/host` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { HostPage } from "../../components/luma/community";` |
| `/invitations` | `import { MobileAccount } from "@repo/ui/account";` |
| `/invitations/sports` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { SportsInvitations } from "../../../components/luma/community";` |
| `/login` | `import { useEffect } from "react";`<br>`import { useRouter } from "next/navigation";`<br>`import { legacyAuthDestination } from "@repo/ui/lib/auth-routes";`<br>`import Loading from "../auth/loading";` |
| `/membership-card` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { MembershipCardPage } from "../../components/luma/ticket";` |
| `/memberships/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { MembershipDetail } from "../../../components/luma/bookings";` |
| `/memberships` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { MembershipsPage } from "../../components/luma/bookings";` |
| `/messages/conversation` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { ConversationPage } from "../../../components/luma/community";` |
| `/messages/details` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { ConversationDetails } from "../../../components/luma/community";` |
| `/messages` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { MessagesPage } from "../../components/luma/community";` |
| `/notifications` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { NotificationsPage } from "../../components/luma/community";` |
| `/notifications/preferences` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { NotificationPreferences } from "../../../components/luma/community";` |
| `/orders/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { OrderDetail } from "../../../components/luma/bookings";` |
| `/orders` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { OrdersPage } from "../../components/luma/bookings";` |
| `/` | `import { HomePage } from "../components/luma/home";` |
| `/privacy` | `import { PublicPrivacyPage } from "@repo/ui/account";` |
| `/profile/complete` | `import { CompleteProfilePage } from "@repo/ui/account";` |
| `/profile/edit` | `import { MobileAccount } from "@repo/ui/account";` |
| `/profile` | `import { MobileAccount } from "@repo/ui/account";` |
| `/profile/settings` | `import { MobileAccount } from "@repo/ui/account";` |
| `/profile/settings/privacy` | `import { MobileAccount } from "@repo/ui/account";` |
| `/qa/ph0` | `import { notFound } from "next/navigation";` |
| `/reset-password` | `import { LoginPage } from "@repo/ui/account";` |
| `/saved/clubs` | `import { SavedClubsPage } from "../../../components/discovery/saved-pages";` |
| `/saved/coaches` | `import { SavedCoachesPage } from "../../../components/discovery/saved-pages";` |
| `/saved` | `import { SavedClubsPage } from "../../components/discovery/saved-pages";` |
| `/services/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { ServiceDetail } from "../../../components/luma/services";` |
| `/services` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { ServicesPage } from "../../components/luma/services";` |
| `/sessions` | `import { MobileAccount } from "@repo/ui/account";` |
| `/set-password` | `import { SetPasswordPage } from "@repo/ui/account";` |
| `/support/detail` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { SupportDetail } from "../../../components/luma/community";` |
| `/support` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { SupportPage } from "../../components/luma/community";` |
| `/tickets/view` | `import { PageLoading } from "../../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { TicketPage } from "../../../components/luma/ticket";` |
| `/training/conversation` | `import { Suspense } from "react";`<br>`import { TrainingCollaboration } from "@repo/ui/training";` |
| `/training` | `import { TrainingHome } from "@repo/ui/training";` |
| `/training/plan` | `import { Suspense } from "react";`<br>`import { TrainingBuilder } from "@repo/ui/training";` |
| `/training/workout` | `import { Suspense } from "react";`<br>`import { TrainingWorkout } from "@repo/ui/training";` |
| `/waitlist` | `import { PageLoading } from "../../components/luma/page-loading";`<br>`import { Suspense } from "react";`<br>`import { WaitlistPage } from "../../components/luma/bookings";` |

## Runtime verification

Passed locally:
- TypeScript: application, UI package, business and admin; changed application/UI files pass ESLint.
- 39 existing navigation, native vault, auth-return and motion tests pass. No new dependencies.
- Actual components rendered with an isolated fetch adapter: discovery, club detail, gallery, cards, signed-in home, guest welcome, services/detail, bookings/detail, memberships, orders, messages, notifications, profile, settings, privacy, coaching, training, workout and builder. These are 20 representative screen families plus guest welcome; this is not a claim of all route/state combinations or real-device testing.
- At 360px the checked screen families have document scroll width equal to viewport width. Discovery also passes 390px and 768px; the tablet app frame stays 576px. Persian/RTL and English/LTR, light and dark were reviewed on representative screens, not a full cross-product.
- Workout set completion updates the count, enables Finish and starts the deadline-based rest timer. The compact table preserves accessible input names and every field.
- Collapsing filters preserves a visible invalid-price warning; reset restores results. Filled, empty, error and guest catalog states render without overflow.
- Sign-in sheet fits 360px; reduced motion has 0s animation; closing restores focus to its trigger. Checkbox is square 20x20 with a 44px label target and uses Radix data-state for checked styling.

Additional corrections from visual review: club detail now exposes its existing branch-specific booking destination; empty reviews do not display a fabricated zero average; profile gradient removed; privacy explanations collapse above controls; coaching navigation scrolls on one row. Training service worker registers only in production; cache bumped to v6 so published training assets refresh. The stale worker cache on the disposable localhost QA origin was cleared.

Runtime screenshots and DOM measurements are under `.artifacts/mobile-redesign/`. Fixtures stay behind GYM_QA_WEB, are excluded from native export, reject real mutations and never recreate server data. The production QA route renders the not-found page with noindex. Next streams this response with HTTP 200 after the root layout has started; there is no fixture UI on the public route.

Public verification:
- Application 43eeedc, business/admin acc75e1 are READY on their existing free Vercel projects. API is unchanged.
- Public `/qa/mobile` visibly renders “404: This page could not be found.” with `noindex`; no fixture controls appear. `/qa/ph0` is gated too.
- Public catalog: 0 clubs and 0 services. No accounts or catalog entries were recreated.
- Published welcome checked at 390px; screenshot `.artifacts/mobile-redesign/published-home-390.png`.

CI repairs: translated the local QA controls, corrected an existing API formatting violation, and excluded the QA-only harness from the native staging type graph (fixtures are deliberately absent there). A staged TypeScript graph check confirms that exclusion; the normal web typecheck still checks the harness. Final verification:
- Full CI [39764965028](https://github.com/hamidYeganeh/Gym4Me2/actions/runs/39764965028), source `052eba8`: verify and iOS jobs both SUCCESS. Includes lint/types, existing unit and PostgreSQL integration suites, commerce/coaching/training/notifications, backup drill, four project builds and native builds.
- Connected Android [39764726543](https://github.com/hamidYeganeh/Gym4Me2/actions/runs/39764726543), source `0c553ad`: SUCCESS. Installed-app testing on a physical phone remains outside these results.
- Local file `.artifacts/android-demo/Gym4Me-mobile-refresh.apk`: 22,873,549 bytes; SHA-256 `07ad85ba38e7d01ac76ff41775d57813b34862bf6875afe8f3081bc433d10a8f`. Artifact ZIP digest, APK signature, app ID and bundled online API verified. Receipt `.artifacts/mobile-redesign/android-receipt.json`.
- This debug APK has a different signing certificate from the previous download and cannot update that installation in place. Keep/export any local draft before a manual reinstall; no installed app or local phone data was deleted by this task.
- 39 targeted local navigation/native/motion tests and 54 API unit tests pass. The local dev server and temporary browser viewport overrides were stopped/reset.

No dependency, paid service, seed, account provisioning or database mutation was added by the visual work. The online catalog remains empty by the earlier user request.

## Intentionally refreshed design baseline

- `packages/ui/src/kit/ClubCard/ClubCard.styles.ts`
- `packages/ui/src/kit/ClubCard/ClubCard.tsx`
- `packages/ui/src/kit/CoachCard/CoachCard.styles.ts`
- `packages/ui/src/kit/ClubBranchCard/ClubBranchCard.styles.ts`
- `packages/ui/src/kit/ClubDetail/ClubDetail.tsx`
- `packages/ui/src/kit/ClubDetail/ClubDetail.styles.ts`
- `packages/ui/src/kit/Button/Button.styles.ts`
- `packages/theme/src/globals.css`
- `apps/application/components/discovery/club-page.tsx`
