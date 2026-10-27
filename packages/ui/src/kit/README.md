# Animate UI kit

The kit uses `@animate-ui/react` 2.2.1. Existing component folders retain their
implementation, styles, types and public exports. New catalogue entries expose
the upstream components and types through small `index.ts` modules.

```tsx
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/kit/Dialog";
import { Fade } from "@repo/ui/kit/Fade";
import { CopyButton, CopyButtonIcon } from "@repo/ui/kit/CopyButton";
import { AnimateUIProvider } from "@repo/ui/kit/AnimateUIProvider";
```

## Catalogue

The complete [Primitives catalogue](https://animate-ui.com/docs/primitives) is
available through these kit entry points:

| Group          | Entry points                                                                                                                                                                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components     | Accordion, AlertDialog, Checkbox, Collapsible, Combobox, ContextMenu, Dialog, Drawer, DropdownMenu, HoverCard, InputOtp, Menubar, NavigationMenu, Pagination, Popover, PreviewLinkCard, Progress, Questionnaire, RadioGroup, Select, Sheet, Sidebar, Slider, Switch, Tabs, Toast, Toggle, ToggleGroup, Tooltip |
| Animate UI     | AvatarGroup, CodeBlock, Cursor, GitHubStars, MotionGrid, PageTransition, PinnedList, ScrollProgress, Spring                                                                                                                                                                                                    |
| Buttons        | Button, CopyButton, FlipButton, GitHubStarsButton, IconButton, LiquidButton, RippleButton, ThemeTogglerButton                                                                                                                                                                                                  |
| Text           | GradientText, HighlightText, MorphingText, RollingText, RotatingText, ShimmeringText, SlidingText, SplittingText, SwappingText, TypingText                                                                                                                                                                     |
| Numbers        | CountingNumber, ScrollingNumber, SlidingNumber                                                                                                                                                                                                                                                                 |
| Effects        | AutoHeight, Blur, Click, Effect, Fade, Highlight, ImageZoom, Magnetic, Particles, ScrollFade, Shine, Slide, ThemeToggler, Tilt, Zoom                                                                                                                                                                           |
| Backgrounds    | BubbleBackground, FireworksBackground, GlyphBackground, GradientBackground, GravityStarsBackground, HexagonBackground, HoleBackground, StarsBackground, TopographyBackground                                                                                                                                   |
| Infrastructure | AnimateIcon, AnimateUIProvider                                                                                                                                                                                                                                                                                 |

Compound parts and their types are exported from each entry point. For example,
`@repo/ui/kit/TypingText` also exports `TypingTextCursor`, and
`@repo/ui/kit/PageTransition` exports `PageTransitionShared`. Upstream's GitHub
primitive spells its export `GithubStars`; its kit folder is `GitHubStars`.

The 14 registry components are installed source in `src/animate-ui/`; the kit
entry points re-export them. Animated icon infrastructure is available from
`AnimateIcon`; individual Lucide/Hugeicons can be added from the registry as
needed. The existing app icon catalogue remains available.

## Integration details

- Radix components use the matching Animate UI Radix entry. Combobox uses the
  Base UI entry; Drawer uses the animated Vaul entry. Their base packages remain
  installed. Avatar, ScrollArea and structural primitives such as Slot and Label
  retain their upstream implementation, as Animate UI has no motion replacement
  for them.
- Enter/exit CSS utilities were removed from the migrated components' separate
  styles files. Mobile Dialog content identifies itself with `data-side="bottom"`
  so Animate UI animates it as a sheet. Global mobile geometry remains in
  `luma-system.css`; its old transform keyframes were removed.
- Dialog and Sheet retain the kit's controlled state, drag handles and callbacks.
  Dialog and BottomSheet retain overlay history and focus restoration. A retained
  portal refocuses its content if reopened during its exit animation.
- `SlidingNumber` retains `value`, locale formatting, grouping and minimum-two-digit
  padding. Latin ungrouped values use the upstream roller. Persian/Arabic glyphs,
  grouping and padding use the localized renderer with Animate UI's motion tokens,
  provider tempo and reduced-motion support. `SlidingNumberPrimitive` exposes the
  exact upstream component, whose numeric prop is `number`.
- `AnimatedThemeToggler` retains the app's existing theme-shape options. The
  upstream `ThemeToggler` and `ThemeTogglerButton` are also available. Existing
  app notifications retain their API; `Toast` exposes Animate UI's Base UI
  primitive. `PageTransition` is available for composition; the app's existing
  navigation, scroll restoration and route history integration remains intact.
- `AnimateUIProvider` is optional. Primitives use their own default timing and
  respect system reduced motion without a provider. Use `tempo` when adjusting
  the overall pace.

## Text inputs

`Input` uses `@base-ui/react/input` with the existing kit styles. `SmoothInput`
adds the spring caret from [Skiper UI / Skiper106](https://skiper-ui.com/v1/skiper106)
by @gxuri. `TextField` composes it with Base UI labels, descriptions and errors.
See [TextField](TextField/README.md) and [SmoothInput](SmoothInput/README.md) for
props, attribution, native-caret fallbacks and form integration.

## Verification fixture

Start the application with `GYM_QA_WEB=true` and open `/qa/kit` for interactive
checks of migrated controls, overlays, RTL and reduced motion. The route returns
404 when the QA flag is absent. Production routes do not mount the fixture.
