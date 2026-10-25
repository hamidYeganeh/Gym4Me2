# Website asset sources

## User-supplied fitness illustration sheet — 2026-10-24

`images/fitness/fitness-objects.png` is the user's original, unmodified matte charcoal fitness illustration sheet, also bundled in the application. Shared decorative illustration components display individual tiles using CSS background positioning. The art supports empty states and the location section's app note. No Mobbin screenshot or reference card photograph is bundled by this change.

## Original hero assets

Reference: https://nova-template.modulify.website/ (captured 2026-10-24).

The ten photographs are the exact Unsplash images used by that reference, saved at 2400px for backdrops and 640px for preview cards (`q=78`, fit=crop). These original reference images are retained; the current default club catalog uses the application fixtures described below.

| File stem        | Unsplash photo ID          |
| ---------------- | -------------------------- |
| matterhorn       | 1617395547071-98efcee72011 |
| ama-dablam       | 1637846959991-18e54d6e2035 |
| fuji             | 1610375228550-d5cabc1d4090 |
| torres-del-paine | 1586600822178-26dec0f653a9 |
| seceda           | 1615729947596-a598e5de0ab3 |
| kirkjufell       | 1595742744735-415fc20ef88f |
| aoraki           | 1531804226530-70f8004aa44e |
| tre-cime         | 1579609872305-cd979b49650f |
| lofoten          | 1518124880777-cf8c82231ffb |
| huayna-picchu    | 1565452122372-c38b171b9629 |

Fonts are the reference's self-hosted Google Fonts Inter (Latin and Latin Extended) and Archivo (Latin) WOFF2 files. Both families are licensed under the SIL Open Font License; license texts are included beside the fonts. Control icons are the source page's SVG assets, saved as standalone files. The reference template's reuse terms apply to its design and copy.

## Crema download section

Reference: https://crema-template.modulify.website/ (captured 2026-10-24). Assets are stored in `download/` and served locally.

- `crema-bg.png` and `crema-bg-mobile.png`: original desktop and phone backgrounds from `https://pub-dc2abe5caae44240a6d1913566a75e0f.r2.dev/sections/crema/`.
- The ten transparent food PNGs (`cupcake`, `chocolate-muffin`, `chocolate-bar`, `sugar-cube`, `barista-coffee`, `croissant`, `turkish-coffee`, `iced-coffee`, `donut-1`, `donut-2`) come from the same source asset directory.
- `iphone.glb`: original `https://crema-template.modulify.website/models/iphone-17-pro-compressed.glb` model. The reference template/model reuse terms remain applicable.
- `fraunces-normal.woff2` and `fraunces-italic.woff2`: original variable Latin Google Fonts assets. Fraunces uses the SIL Open Font License included in `Fraunces-OFL.txt`.
- JPEG filenames preserve the exact Unsplash photo IDs used for avatars, reviewers, products, and ingredients. Their source is `https://images.unsplash.com/photo-{id}`; captured source crop/quality variants are retained locally.
- Store/social SVGs and `screen-mask.svg`: extracted original SVG markup. The three `screens/*.html` files preserve the original passive preview markup with remote images replaced by local paths; no original scripts are included.
- `poster.png`: archived original source scene capture; the current fallback renders the localized app UI.

The original source assets remain archived; current runtime content is described in the follow-up below. Reference template terms and original asset licenses still apply to retained source media.

## Stream Showcase classes hero

Reference: https://stream-showcase-template.modulify.website/ (captured 2026-10-24). All static assets are stored in `classes/`.

- The five posters (`ship-with-ai.jpg`, `founder-os.jpg`, `solo-to-saas.jpg`, `growth.jpg`, `deep-work.jpg`) and corresponding `*-full.jpg` preview images are the original files from `https://stream-showcase-template.cdn.modulify.website/stream/`.
- The 34 episode thumbnails preserve their YouTube video IDs as filenames. Originals were downloaded from `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`. The episode data retains the reference's video IDs, titles, and duration labels. Videos use the official YouTube player when selected; video streams are not copied or hotlinked as static assets.
- `caveat-brush.woff2`, `geist.woff2`, and `playfair-*.woff2` are the reference's original Latin font files from its `_next/static/media/` directory. Their SIL Open Font License texts are included beside them.
- `logo.svg`, `star.svg`, `series.svg`, `playlist.svg`, `documentary.svg`, `close.svg`, `menu.svg`, and `play.svg` preserve the source SVG markup, exported with standalone namespaces and explicit source colors. No icon was redrawn or substituted.

The original design, artwork, copy, and reference template reuse terms remain applicable. The third-party editor badge is intentionally excluded from the app.

## Shared application assets

`images/clubs/{strength,studio,training}.webp` reuse the optimized illustrative club photography already shipped by `apps/application/public/images/clubs/`. Current typography is loaded from `@repo/theme/fonts` (IRANSansX); original reference font files remain archived locally. The Gym4Me logo and UI icons come from the shared theme/UI packages. The localized phone screen now uses the shared club photography for Gym4Me discovery, classes and schedule previews.

## Generated fitness artwork — 2026-10-24

`download/gym-3d/{dumbbell,kettlebell,bottle}.png` were generated with the built-in `image_gen` tool, one asset per call. All preserve genuine alpha transparency. Their matte charcoal material, rounded shapes and restrained studio highlights are directed by the user's three attached style references. The attached camera, fan and phone are style references only and are not shipped as website props. The complete prompt set and mode are in [gym-3d-prompts.json](download/gym-3d-prompts.json).

Current classes use shared `ClassCard` with illustrative fitness data. Original Stream posters/videos and Crema food photos are retained as historical reference files and no longer appear in the default landing sections. The current phone preview and feature cards make no fabricated ratings, membership counts or testimonial claims.

Mobbin Luma screenshots were used as design references only; they are not served from public assets. Canonical source links are in the app README.


## Location photography — 2026-10-24

`images/locations/*.webp` contains five Wikimedia Commons photographs, resized and center-cropped to 800 × 950 pixels. The same optimized files are bundled in the application. Authors, original files, licenses, and modifications are recorded in [the publicly linked credits](images/locations/credits.txt). The source screenshot guides the shared card's geometry and translucent overlays; its London/Rome photos and people are not shipped.
