# Theme

Design tokens as CSS variables, their Tailwind v4 utilities, and a React theme provider.
The Gym4Me palette uses dark surfaces and Gym4Me green (`#20FA6D`) for primary actions.

## Three layers

```
primitives.css   --theme-ref-*      the raw palette, written once
      ↓
semantic tokens  --theme-color-*    roles: background, primary, muted-foreground …
                 --theme-radius-*   control, card, panel …
                 --theme-shadow-*, --theme-text-*, --theme-space-* …
      ↓
components.css   --theme-button-radius, --theme-input-radius, --theme-focus-ring …
      ↓
Tailwind         bg-theme-primary, text-theme-muted-foreground, rounded-theme-card …
```

| File (`src/styles/tokens/`) | Owns                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `primitives.css`            | The palette (`--theme-ref-black`, `--theme-ref-neutral-600`, `--theme-ref-teal-500` …). **Only file with colour values.** |
| `colors.css`                | Colour roles for light and dark, each pointing at a primitive                                                             |
| `radius.css`                | Size scale (xs–3xl) and semantic shapes: `control` 12px, `card` 16px, `panel` 22px, `pill`                                |
| `shadows.css`               | Soft elevation xs–xl and inner                                                                                            |
| `typography.css`            | Families, weights, text styles (`display` … `caption`) with line heights                                                  |
| `spacing.css`               | 4px spacing scale and layout gaps                                                                                         |
| `motion.css`                | Durations, easings, transitions; reduced motion                                                                           |
| `components.css`            | Shared component decisions: button/input/card/panel radius, focus ring                                                    |

`src/theme.css` imports them in that order; `src/styles/tailwind.css` maps the semantic and
component tokens to Tailwind utilities. Primitives are **not** mapped to Tailwind, so components
can only use roles.

## How to change things

| I want to…                     | Change                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Change the brand black or teal | One line in `primitives.css` (e.g. `--theme-ref-black`)                                                                       |
| Make primary something else    | `--theme-color-primary` (and its `-foreground`, `-hover`) in `colors.css`, light and dark                                     |
| Round every button differently | `--theme-button-radius` in `components.css`                                                                                   |
| Change all card corners        | `--theme-radius-card` in `radius.css`                                                                                         |
| Add a colour role              | `colors.css` (light **and** dark) → `tailwind.css` (`--color-theme-<role>`) → Storybook list in `packages/ui/src/foundations` |
| Add a text style or radius     | Its token → `tailwind.css` → `packages/ui/src/lib/merge.config.ts`, so `cn()` merges it correctly                             |

Then run `npm run test --workspace @repo/theme`. The tests check that:

- every token Tailwind uses is defined;
- semantic colours only point at primitives, and there are no literal colours in that layer;
- light and dark define the same roles;
- the main text and fill pairs meet **WCAG AA (4.5:1)** in both modes.

## Colour roles

| Role                                                                    | Use for                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `background`, `foreground`                                              | Page and its text (`#0B0B0D` on white)                                                  |
| `card`, `popover` (+ `-foreground`)                                     | Raised surfaces                                                                         |
| `surface-soft`                                                          | Light grey bands and soft cards                                                         |
| `surface-dark` (+ `-foreground`, `-muted-foreground`, `-border`)        | Black feature panels that stay dark in both modes                                       |
| `navy` (+ `-foreground`)                                                | The footer                                                                              |
| `primary` (+ `-foreground`, `-hover`)                                   | The main action. `#0B0B0D` with white text in light; near-white with black text in dark |
| `secondary` (+ `-foreground`)                                           | Quiet buttons and chips                                                                 |
| `tertiary` (+ `-foreground`, `-hover`)                                  | Brand teal as a **fill**: small highlights, active markers. Never text on white         |
| `accent` (+ `-foreground`)                                              | Teal as **text**: links, subtitles, labels                                              |
| `muted`, `muted-foreground`                                             | Quiet backgrounds; secondary text (`#5C5C5C`)                                           |
| `border`, `border-strong`, `input`, `ring`                              | Lines, field borders, focus                                                             |
| `success`, `warning`, `error`, `info` (+ `-foreground`), `warning-text` | Status, always with a word                                                              |
| `chart-1` … `chart-5`, `sidebar-*`                                      | Charts; staff app navigation                                                            |

## Use semantic utilities

| Purpose    | Examples                                                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour     | `bg-theme-background`, `text-theme-foreground`, `bg-theme-primary`, `text-theme-accent`, `bg-theme-surface-dark`                                                                                                                                                                  |
| Shape      | `rounded-theme-control`, `rounded-theme-card`, `rounded-theme-panel`, `rounded-theme-pill`                                                                                                                                                                                        |
| Elevation  | `shadow-theme-xs` … `shadow-theme-xl`, `shadow-theme-focus`                                                                                                                                                                                                                       |
| Typography | `text-theme-display`, `text-theme-h1` … `text-theme-h6`, `text-theme-body-large`, `text-theme-title` (17px), `text-theme-body1`, `text-theme-body-md` (15px), `text-theme-body2`, `text-theme-label` (13px), `text-theme-caption` (13px); `font-theme-primary`, `font-theme-bold` |
| Spacing    | `p-theme-4`, `gap-theme-stack`, `p-theme-page`                                                                                                                                                                                                                                    |
| Motion     | `theme-motion-colors`, `theme-motion-transform`                                                                                                                                                                                                                                   |

**Rules:**

- No literal colours (`bg-[#0d0d0d]`), Tailwind palette classes (`bg-neutral-100`, `text-white`) or default radii (`rounded-2xl`) in apps or the kit: use a role.
- The smallest text is 13px.

## Import styles

```css
@import "tailwindcss";
@import "@repo/theme/tailwind.css";
```

Plain CSS consumers can import `@repo/theme/theme.css`; single layers are exported as
`@repo/theme/tokens/*.css` (import `primitives.css` before any semantic layer).

Set `.dark` or `data-theme="dark"` to select dark tokens. Component sizes use xs/sm/md/lg/xl,
with md as the default. CSS motion tokens respect the reduced-motion media query.

## Fonts

Applications can supply local fonts using the CSS variables defined by the typography tokens.

## React provider

```tsx
import { ThemeProvider } from "@repo/theme";

<html suppressHydrationWarning>
  <body>
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>;
```

Defaults: a class attribute, system preference, and no transitions while the mode changes.
Client components use `useTheme` from `@repo/theme` (`setTheme("light" | "dark" | "system")`).
Wait until mounted before rendering content that depends on the resolved theme.
