# Gym4Me — Luma redesign plan

Date: 2026-10-23. Status: proposal before implementation.

The user authorized redesigning every application, business and administration
surface, including previously protected cards, and asked to see the scope first.
No product code, data, providers or deployments are changed by this document.

## Reference evidence

The primary reference is now the user-supplied export at
`/Users/mahdi/Downloads/Luma ios Sep 2026/`: 393 PNG screenshots. The folder
contains no video. A first planning pass inspected fifty systematically spaced
screens in two contact sheets and six key screens at readable resolution. This
is an initial reference review, not a claim that every screenshot/state has
already been studied in depth.

| Local screenshot            | Observed pattern                                                                        | Gym4Me mapping                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Luma ios Sep 2026 24.png`  | Date-grouped agenda, compact image rows, floating Home/Discover/Chat navigation         | My Schedule: upcoming sessions, today's workout and direct ticket/start actions |
| `Luma ios Sep 2026 72.png`  | Ticket options in rounded rows, price/time/remaining capacity, pinned Next action       | Session/access-plan selection with actual quote and availability                |
| `Luma ios Sep 2026 112.png` | Cover-led creation, grouped start/end rows, location/description and ticketing controls | Host service/session creation with progressive disclosure of advanced rules     |
| `Luma ios Sep 2026 184.png` | Attendance tabs and participant detail sheet                                            | Role-scoped reception list, arrival status and permitted member details         |
| `Luma ios Sep 2026 264.png` | City context, image-led event rows, categories and city cards                           | Sports discovery with clubs, sessions, coaches and location filtering           |
| `Luma ios Sep 2026 328.png` | Grouped account/preferences/resource rows, colored icon tiles and back control          | Profile, account/security, notifications, appearance and support                |

The previously supplied browser-tab mention was unavailable. Connected Mobbin
tools also supplied the following secondary references, whose actual preview
images were inspected. Where their capture version differs, use the local
September export as the visual source of truth.

| Reference                                                                            | Observed pattern                                                                                                              | Gym4Me application                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Event detail](https://mobbin.com/screens/fc225571-3761-4e53-96d8-ae3ad2d5ecd0)      | Large cover, cover-tinted background, compact metadata, one emphasized registration action                                    | Club, branch, coach service and session detail                                        |
| [Map](https://mobbin.com/screens/fb378b19-93e3-4cac-b862-fd3208c4c59e)               | Image markers and a floating navigation pill                                                                                  | Club/session map with selected result                                                 |
| [Category](https://mobbin.com/screens/fd7a7128-2c46-4574-9d0f-dbd8213ef7c2)          | Short introduction, compact calendar rows, nearby results                                                                     | Sport categories, clubs and followed branch calendars                                 |
| [Registration flow](https://mobbin.com/flows/dc9085b2-fae1-48f7-a5be-ebafa1af2757)   | Focused registration surface with event summary, necessary questions and one main action; registered status returns to detail | Session selection, eligibility/terms, quote/payment and confirmation                  |
| [Terms sheet](https://mobbin.com/screens/efa77a29-7e68-4848-bf7f-8fd245f35fd5)       | Event remains behind a focused terms surface                                                                                  | Booking conditions without losing checkout state                                      |
| [Ticket](https://mobbin.com/screens/fd60dbd4-6f2f-43e8-a2a8-dbf6954b3f59)            | Full-focus QR, compact ticket information and close action                                                                    | Existing valid membership/reservation access token                                    |
| [Host management](https://mobbin.com/flows/3218a4cd-cccc-4364-90a8-dcef7d8a135d)     | Grouped rows for details, guests, hosts, check-in, ticketing, coupons, questions and destructive actions                      | Service details, occurrences, participants, staff, capacity, discounts and attendance |
| [Check-in settings](https://mobbin.com/screens/eeccb082-0e2b-4646-a7e1-19b80d01b334) | Clear primary scanner action, separated settings and staff area                                                               | Reception entry screen and role-scoped controls                                       |

Static screenshots establish geometry and visual states, not animation timing,
spring physics or interactive gestures. Flow video/runtime observation is needed
before claiming motion is an exact match. Where unavailable, label matching
behavior as an approximation rather than inventing measured values.

## Coverage

Inventory: 112 product page files — application 62, business 26, admin 24 — plus
two existing application QA pages. Aliases can share a design, but every route
must appear in the implementation/acceptance matrix. Include loading, empty,
error, offline, pending, success, disabled, denied and expired states as relevant.

### Shared design system

- Unify light/dark surfaces, type hierarchy, spacing, radii, icons, separators,
  controls, overlays, image treatments and interaction states.
- Keep Gym4Me identity, sports imagery, Persian font, RTL and English support.
  Use Luma-like neutral high-contrast controls and restrained brand accents;
  detail backgrounds can take a subtle tone from the cover.
- Match the September export's light surfaces as well as its cover-tinted dark
  detail surfaces. Extract per-pattern spacing, shape, type, translucency and
  hierarchy from the source instead of imposing one dark card treatment on all
  screens. Keep blur localized to overlays/navigation and verify its phone cost.
- Reuse the existing UI primitives and dependencies. Style Button, Input,
  Select, Date/Time, tabs, badges, rows, cards, dialogs, sheets, toasts,
  skeletons, charts and data tables through shared variants.
- Use grouped rows and disclosure for management settings. Keep financial data
  and analytics dense enough for desktop while providing a mobile reading order.

### Athlete and coach application

- Proposed floating primary navigation: My Schedule, Discover, Chat. Put profile
  and settings behind the account avatar. Preserve current URLs/deep links.
- My Schedule includes upcoming bookings and today's workout, with direct start,
  resume and access-ticket actions. Programs/history/progress remain reachable.
- Redesign discovery, search, filters, saved items, comparison, map, club/branch
  galleries, reviews, opening hours, coaches and service details as one family.
- Redesign booking/session selection, waiting list, checkout, payment states,
  orders, cancellation/refund and membership/ticket surfaces around the focused
  registration/ticket pattern. Preserve required conditions and accurate totals.
- Restyle program building, assignment, workout logging/rest timer, progress,
  private coaching, weekly reports and feedback without obscuring saved/offline
  state or changing athlete consent.
- Apply the same system to authentication, account completion, invitations,
  profile/edit, sessions/security/privacy, notifications/preferences, documents,
  messages, support and public calendars.

### Business and administration

- Business uses a host-management model: organization/branch context, upcoming
  sessions, grouped management actions and clear access to reception and finance.
  Calendar, services, resources, staff, coaching, memberships, imports, messages,
  reports, payments and settlements receive the same design language.
- Admin uses the same tokens and primitives, with date-filtered metrics, charts,
  sortable/filterable lists and reasoned actions. Cover users, organizations,
  publication/review queues, coach verification, taxonomy/geography, operations,
  audit, plans/settlements, dispatch controls and account settings.
- Desktop keeps a stable workspace navigation and mobile uses an appropriate
  compact shell; do not force a narrow phone composition onto large tables.
- Permission checks remain on the server. Visible actions and empty/denied states
  must also reflect each role's actual scope.

## Proposed experience additions

These are bounded UX improvements, not a new business phase:

1. A unified personal agenda for bookings and workouts; day/week views where
   useful for athlete, coach and host.
2. Contextual quick actions: open ticket, continue workout, manage occurrence,
   review attendance or respond to a student from the relevant summary.
3. Remember list filters/scroll for the current account and scope. Reset local
   sensitive state on logout/account switch as required by existing privacy rules.
4. Add camera QR scanning to reception, retaining manual code entry as a fallback.
   The current UI source has manual entry and no camera scanner implementation.
   Reuse the existing authorized check-in command and replay-safe accounting;
   permission denial or unsupported cameras must leave manual entry available.

Luma's staged sheets, row details and deliberate destructive confirmation are
interaction patterns to implement across existing workflows. Drag confirmation
must have an accessible button/keyboard alternative. The screenshots' wallet,
crypto, contact-import and Luma Plus features do not create new Gym4Me business
requirements; adapt each surface to actual sports capabilities and permissions.

Existing map, purchase, QR, coaching, reviews, analytics and notifications are
existing capabilities being redesigned, not newly implemented capabilities.
External payment/SMS/native push providers remain separate configuration work.

## Architecture

- `@repo/theme` owns visual and motion tokens; `@repo/ui` owns shared primitives,
  recurring patterns, shells and interaction behavior; `@repo/api` retains typed
  data access. Feature modules own their domain presentation and workflows.
- Consolidate duplicate mobile/workspace cards, sheets, headers and states. Split
  large feature files by behavior behind small interfaces, rather than adding
  another styling wrapper. Current examples include the 2,124-line sports
  workspace, 1,138-line business catalog and 935-line training builder.
- Preserve API authorization, revisions, idempotency, quote/capacity/financial
  rules, versioned programs, offline queue and consent rules. Add or change a
  query only when a new agenda view actually needs it.
- Keep a single route/overlay motion policy with interruption, scroll restoration,
  focus, browser/native Back and reduced-motion behavior. Prefer transform and
  opacity. Bound background blur and image decoding work on mobile.
- Use current 120/220/200 ms timings as the initial baseline; calibrate individual
  interactions against observed Luma flows under the user's latest matching
  request. Do not impose the skill's generic timing scale blindly.

## Implementation order and finish criteria

1. Map every route/state to a specific Luma reference or an explicitly adapted
   sports/admin layout; record the new visual baseline.
2. Use the 12ui workflow where available within the zero-spend constraint to
   establish eight representative designs: personal agenda, discovery, club/
   service detail, booking/payment/ticket, workout, coaching, host management and
   admin analytics. Select one coherent direction and extend its shared system.
3. Implement shared tokens/primitives/shells, then migrate all feature families.
4. Complete navigation, sheets, transitions, gestures and recovery behavior with
   the same state contracts. Preserve deep links and in-progress work.
5. After coding, run sequential functional/visual/performance checks, fix findings,
   then push, deploy and produce an updated Android artifact.

Acceptance includes representative 360/390/768/1440 layouts, Persian/English,
light/dark, keyboard/focus, reduced motion, mobile Back/keyboard/safe areas,
low-end mobile performance and the existing eight-role booking/payment/training
regressions. Track route coverage explicitly, not just a few showcase screenshots.

The latest blanket design authorization supersedes the old restriction on 59
catalog files. Update their baseline only after reviewing the intended redesign;
retain the guard against accidental future drift. No schema reset, production
data deletion, paid service or live-provider activation is part of this redesign.
