# Theme architecture

- Three token layers in `src/styles/tokens/`:
  1. `primitives.css`: the raw palette, `--theme-ref-*`. The only place colour values live.
  2. Semantic tokens: `colors.css` (light and dark roles), `radius.css`, `shadows.css`,
     `typography.css`, `spacing.css`, `motion.css`. Each colour role points at a primitive with
     `var(--theme-ref-…)`, never a literal.
  3. `components.css`: shared component decisions (button/input/card/panel radius, focus ring),
     pointing at semantic tokens.
- `src/theme.css` imports the layers in that order; keep primitives first.
- `src/styles/tailwind.css` maps semantic and component tokens to Tailwind (`--color-theme-*`,
  `--radius-theme-*` …). Never map primitives to Tailwind, and map the shadcn color aliases to the same semantic roles.
- Components and apps use semantic utilities only: no literal colours, no Tailwind palette
  classes (`bg-neutral-*`, `text-white`), no default radii (`rounded-2xl`).
- A new colour role goes into light **and** dark, into `tailwind.css`, and into the Storybook
  Foundations list. A new text style, radius or shadow also goes into
  `packages/ui/src/lib/merge.config.ts`.
- Run `npm run test --workspace @repo/theme` after any token change. It checks definitions,
  light/dark parity, no literals in the semantic layer, and WCAG AA contrast.
- Preserve public package import paths when reorganizing internals.
- Keep next/font calls in the Next.js application. Font variables use `--next-font-primary`,
  `--next-font-fa-primary` and `--next-font-mono-primary`; locale-aware CSS selects the family
  by the document's `lang`.
- Keep motion durations behind tokens and respect prefers-reduced-motion. Owned motion utility
  recipes use `theme-motion-*` names.
