# Component conventions

For every requested shadcn addition to the kit, check the installed
`@animate-ui/react` package and the [Animate UI docs](https://animate-ui.com/docs)
for an animated counterpart. If available, implement and add that counterpart
alongside the requested component. If unavailable, skip the animated counterpart;
do not invent custom motion as a substitute. Follow the kit folder conventions
below for animated components as well.

Every kit and UI component family lives in a PascalCase folder named after it.
Simple compound parts are sibling files within that family, as described below.
Use this structure for each component:

```text
Button/
  Button.tsx
  Button.styles.ts
  Button.types.ts
  Button.storybook.tsx
  index.ts
```

- Keep rendering and behavior in the component file with a default export.
- Use `const Component: FC<ComponentProps> = (props) => { ... }` and destructure
  props inside the body. Animated counterparts live inside the component folder
  in `AnimatedComponent/`, with rendering, styles, types, a story and a barrel.
  The parent barrel exposes named animated exports; share the primitive recipe.
  Headless generic roots retain upstream types through transparent aliases.
- Group base classes with `cn` imported from `tailwind-variants`, keeping layout,
  typography, focus and state classes on separate readable lines.
- Controls expose semantic color, appearance variant, size and radius when useful.
  Use className for font size and one-off overrides; keep native props and refs.
- Define styles and variants using `tailwind-variants` in `.styles.ts`.
- Export the component's variant recipe from `.styles.ts`. Keep visual
  `variant` (for example contained, outlined, text) separate from semantic
  `color` (primary, secondary, error, success, warning, info). Infer public
  variant props from that recipe; omit conflicting native HTML props.
- Use `@repo/theme` semantic utilities or `--theme-*` CSS variables for design
  decisions. Add shared tokens to the theme package when necessary.
- Define public props and inferred variant types in `.types.ts`.
- Write typed Storybook stories in `.storybook.tsx` covering variants and states.
  Storybook consumers must include `**/*.storybook.tsx` in their stories glob
  and load Tailwind with `@repo/theme/tailwind.css`.
- The barrel exports the component as both default and named, plus its public
  types and style recipe. Do not export stories from the barrel.
- Keep package exports pointing at component barrels.

- Use `theme-*` semantic utility names (`bg-theme-primary`, `rounded-theme-md`,
  `theme-typeset-label`). Primitive Tailwind layout classes keep their normal names.
- Expose explicit lowercase package paths. Follow
  [the kit addition workflow](../../docs/adding-kit-components.md) for each new
  component and update the README catalog. Update
  [project decisions](../../docs/decisions.md) when architectural policy changes.

Kit style recipes import the shared `tv` factory from `src/lib/variants.ts`.
Its merge configuration is also used by `cn()`, so namespaced font sizes, colors,
weights and radii compose correctly. Extend that configuration when adding a new
ambiguous semantic utility scale.

Compound components use one PascalCase folder per family. Simple parts such as
CardTitle live in sibling `.tsx` and `.types.ts` files, without per-part folders
or barrels. Keep composition stories at the family level. Define all part styles
and variants in the family `.styles.ts` with a tailwind-variants slots recipe.
Animated parts follow the same flat structure inside AnimatedComponent/ and share
the ordinary family recipe. The family barrel exports all parts and public types.

All size props use xs/sm/md/lg/xl, defaulting to md. Icon-only Button is an
independent iconOnly prop. Keep size/color/radius/shadow Storybook controls in
sync through src/lib/story-controls.ts. Use namespaced theme spacing for component dimensions and gaps. Never add a new default/icon size alias. Base UI parts
preserve state-aware className, render, ref and controlled/uncontrolled props.
