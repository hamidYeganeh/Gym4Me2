# application

See the [workspace README](../../README.md) for setup, ports, shared packages, and validation commands.

## Discovery map

`/discovery/map` uses Neshan's official Web SDK. Create a **Web SDK** key in
[the Neshan platform](https://platform.neshan.org/), allow your website domain
(and localhost for development), then set it in `apps/application/.env.local`:

```dotenv
NEXT_PUBLIC_NESHAN_MAP_KEY=your-neshan-web-sdk-key
```

Restart the dev server after changing the key; production and native exports need
it at build time. This is a public map-display key, not a server services key.
The SDK script and stylesheet load only on the map route. Without a key or if the
map fails to load, search, filters, saved clubs, and club cards remain available.

The current catalog is sample data. Positions in `lib/club-map.ts` are approximate
preview coordinates and must be replaced with verified branch coordinates before
production use. Selecting a price marker selects its card; swiping cards selects
the corresponding marker. Search, category, price, and saved filters apply to both.
