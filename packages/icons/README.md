# Gym4Me icons

React components generated from the supplied Freud duotone SVG collection. Icons render inline, inherit `currentColor`, preserve the source opacity, and default to `1em` in both dimensions. Use `size`, CSS, or ordinary SVG props to override dimensions. Icons are decorative by default. For a standalone informative icon, pass `role="img"` and an accessible name.

```tsx
import { ArrowLeft } from "@repo/icons/arrow-left";

<ArrowLeft size={20} />;
```

Use direct imports on app routes to keep the module graph narrow. The root also provides named exports, with no runtime registry and no side effects.

To regenerate from the original Freud duotone folder, run `python3 packages/icons/scripts/generate.py "/path/to/freud/duotone"` from the repo root. The generated React modules are checked in, so apps do not need Python or the original folder to build.
