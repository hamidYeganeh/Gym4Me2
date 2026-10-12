Club Open Graph cards are 1200 × 630 PNGs, generated in Persian and English from the club preview records and existing club photos.

Regenerate from the repository root:

    node apps/application/scripts/generate-club-og.mjs

Set NEXT_PUBLIC_SITE_URL to the public HTTPS website before deploying. Club metadata and native sharing use that origin; localhost previews cannot be fetched by social platforms.
