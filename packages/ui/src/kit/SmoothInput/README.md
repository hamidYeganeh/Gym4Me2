# Smooth input

Adapted from [Skiper UI / Skiper106](https://skiper-ui.com/v1/skiper106) by
[@gxuri](https://skiper-ui.com). Attribution is required by Skiper's free-version
license. This adaptation retains the spring caret (stiffness 500, damping 30,
mass 0.5), selection tracking, text measurement, font loading and resize handling.
It uses the installed `motion/react`; the demo-only DialKit dependency is omitted.

```tsx
import { SmoothInput } from "@repo/ui/kit/SmoothInput";

<SmoothInput
  name="username"
  aria-label="Username"
  value={username}
  onValueChange={setUsername}
  autoComplete="username"
/>;
```

The actual control is the kit's `Input`, backed by `@base-ui/react/input`. It
retains native input semantics, Base UI Field/Form integration, controlled and
uncontrolled values, `onChange`, `onValueChange`, native validation, form reset,
autofill and an `HTMLInputElement` ref. No duplicate hidden input or synthetic
change event is used. `className` and `style` target the input; `wrapperClassName`
targets its positioning container. All colors, sizes and focus indicators come
from the existing kit `Input` styles and project theme; the overlay uses `primary`.

The caret measures the rendered font, spacing, alignment and horizontal scroll.
It hides while selecting text. Password measurements use masked glyphs, with
the upstream browser-specific bullet adjustment. Check masking if introducing a
custom password font. The native caret handles RTL/bidirectional text, IME
composition, read-only fields and input types without text-selection APIs.
Reduced motion and forced-colors mode also use the native caret. Set
`reducedMotion` for an in-app preference. Before hydration or measurement the
native caret remains available.

Use the plain `Input` when composing a direct-child layout such as `InputGroup`;
the smooth caret requires a positioning wrapper.
