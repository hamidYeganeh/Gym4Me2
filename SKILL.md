---
name: add-kit-component
description: Add shadcn components to gym4me's UI kit, check for Animate UI counterparts, and preserve the existing component folders, file splitting, styles, types, stories, and exports. Use when asked to add or import a shadcn component in this project.
---

# Add a kit component

Read `packages/ui/AGENTS.md` and `packages/ui/components.json`, then inspect a comparable family in `packages/ui/src/kit/` before making changes. `Switch` and `Select` show the standard and animated compound structures; `InputOTP` shows a specialized counterpart. Treat existing project instructions and the current source as authoritative. Documentation links may be absent; do not recreate missing docs as part of a component addition.

## Check Animate UI on every shadcn addition

Check whether the requested component has an Animate UI counterpart. Use the installed `@animate-ui/react` package (its `package.json` exports and type definitions) and the [Animate UI documentation](https://animate-ui.com/docs), including its component catalog and primitive pages. If an `animate-ui` agent skill is installed on your machine, read it too. Do not assume that every shadcn component is animated merely because an umbrella import re-exports its primitive.

- Add the ordinary requested component to `packages/ui/src/kit/<Component>/`.
- When Animate UI supplies a counterpart, also add it inside `<Component>/Animated<Component>/` and import its supported Animate UI primitives there. Keep the ordinary component available alongside it.
- When no counterpart exists, add only the ordinary component and mention that the Animate UI check found no counterpart. Do not invent custom motion to fill the gap.
- Prefer the same primitive family as the ordinary component (the existing kit generally uses Base UI). Preserve native props, refs, state-aware `className`, render props, accessibility, and controlled/uncontrolled behavior.
- Follow the Animate UI documentation's CLI path for generated shadcn files, previewing its changes first. Scope conversion to the animated counterpart, using an isolated staging copy if needed so the ordinary component is retained. Do not run a broad conversion over existing kit families. For existing hand-built wrappers, import the Animate UI primitives directly. Adapt resulting files to this kit's structure.
- Read actual package exports before choosing imports; reuse installed dependencies where compatible. This repository uses npm and `package-lock.json`.

## Preserve the current file splitting

Use PascalCase family and component names. For example:

```text
packages/ui/src/kit/Switch/
  Switch.tsx
  SwitchThumb.tsx
  Switch.styles.ts
  Switch.types.ts
  Switch.storybook.tsx
  index.ts
  AnimatedSwitch/
    AnimatedSwitch.tsx
    AnimatedSwitchThumb.tsx
    AnimatedSwitch.styles.ts
    AnimatedSwitch.types.ts
    AnimatedSwitch.storybook.tsx
    index.ts
```

- Rendering and behavior belong in `.tsx` files with default exports. Use `const Component: FC<ComponentProps> = (props) => { ... }`, destructuring inside the body. Keep headless generic roots as transparent upstream aliases when wrapping would lose inference. Add `"use client"` where required.
- Keep simple compound parts in sibling `.tsx` files, rather than one large file or per-part folders. Keep family composition stories together. Follow the nearest family for whether part types are consolidated in the family `.types.ts` or split into sibling `.types.ts` files.
- Put public props and inferred variant types in `.types.ts`; omit conflicting native props before intersecting variant props. Derive animated props from the animated primitive's types.
- Put styles and variants in the family `.styles.ts`, using the shared `tv` factory from `packages/ui/src/lib/variants.ts`. Use slots for compound families, semantic theme tokens, and the existing class merging helpers. Share the ordinary style recipe with the animated counterpart through its `.styles.ts` re-export, aliasing recipe names only when needed. Avoid duplicating visual recipes or carrying CSS entrance/exit animations that conflict with Animate UI.
- Extract shared behavior into a family `.utils.ts` or `.utils.tsx` only when needed, as in Button; reuse it from ordinary and animated components.
- Keep visual `variant` separate from semantic `color`. Sizes use `xs/sm/md/lg/xl`, defaulting to `md`; reuse `src/lib/story-controls.ts` for relevant controls.
- Each family barrel exports its default and named root, compound parts, public types, and style recipes. The animated subfolder has its own barrel; the parent exposes its named animated exports. Do not export stories or introduce ambiguous duplicate exports.
- Add explicit lowercase package subpath exports in `packages/ui/package.json` pointing at family barrels, following existing entries. Consumers import from paths such as `@repo/ui/kit/switch`, which also exposes `AnimatedSwitch`.
- Add typed `.storybook.tsx` stories covering applicable variants, states, and composition. Use `Animated/<Component>` for the animated story title, matching existing families. Update the README component catalog.

## Verify and report

Before implementation, capture the UI workspace type-check baseline with `npm run check-types --workspace=@repo/ui`. Afterward, repeat it and run `npm run lint --workspace=@repo/ui`. Compare existing failures with new ones. Check exports and stories, and verify motion and reduced motion in a browser when available. Report any verification that could not run.

Summarize the ordinary component added, whether an Animate UI counterpart was found, its folder and public import path, and validation results. Keep unrelated working-tree changes intact.
