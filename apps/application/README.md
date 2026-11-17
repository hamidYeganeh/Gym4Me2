# Gym4Me Application

See the [repository README](../../README.md) for workspace commands and architecture.

## Published clubs

The web directory at `/clubs/` links to published clubs at `/clubs/:clubId`.
Run the production web build with `npm run start --workspace application`.
The Capacitor bundle uses the exported directory page with `?id=:clubId` to
load the same published details on devices.

## Club detail

Open `/club/form-fitness/` (also linked from the home page). The responsive
`/club/[clubId]` route uses the shared shadcn-style kit, Animate UI buttons and
sheet, and existing theme tokens. Gallery selection, local favorites, native
sharing with clipboard fallback, and visit information are interactive.

The catalogue in `features/club/clubs.ts` is explicitly sample data. Static export
generates one route per catalogue entry; unknown IDs have no exported page.
Add real catalogue entries there, or replace the catalogue with a build-time API
when available. Runtime-created IDs require a hosting/routing strategy beyond
the current Capacitor-compatible static export.

The visit sheet is informational: it does not reserve a session or take payment.
Favorites persist on the current device only.

### Preview photography

Local assets are sourced from Unsplash (illustrative, not photographs of a real
FORM Fitness Club):

- Training floor: https://images.unsplash.com/photo-1534438327276-14e5300c3a48
- Strength: https://images.unsplash.com/photo-1517836357463-d25dfeac3438
- Equipment: https://images.unsplash.com/photo-1540497077202-7c8a3999166f

## Member reviews and club-owner sections

The club detail includes section navigation, training highlights, two review
previews, a category rating summary, neighbourhood information, a club-owner
profile, and first-visit guidelines. The original fitness gallery and actions remain.

All reviews live at `/clubs/[clubId]/reviews/`, e.g.
`/clubs/form-fitness/reviews/`. The plural reviews route links back to the singular
club detail route. Search matches review text, member name, and training type;
sorting supports newest, highest rated, and lowest rated.

Review counts, averages, category ratings, and distributions derive from
`reviewEntries`; no independent hardcoded totals are used. Owner details and
reviews are explicitly sample content. The location link searches the
neighbourhood, not an invented club address.

The shared Mobbin flow links were inaccessible during implementation. These
sections use an Airbnb-inspired listing structure, not a verified reproduction
of those particular flows.
