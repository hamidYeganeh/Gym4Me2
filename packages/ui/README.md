# UI kit

Reusable React 19 components styled by `@repo/theme`. Compound controls use
Base UI; supported animated versions use Animate UI.

Import each family from its package export in `package.json`, such as
`@repo/ui/kit/button`. The family entry exports the ordinary component as default
and its animated counterpart by name, for example `AnimatedButton`. Button styles
are computed on the server; interactive client consumers can still pass native
handlers and refs.

## Component catalog

| Import                      | Ordinary family | Animated family     |
| --------------------------- | --------------- | ------------------- |
| `@repo/ui/kit/button`       | Button          | AnimatedButton      |
| `@repo/ui/kit/select`       | Select          | AnimatedSelect      |
| `@repo/ui/kit/checkbox`     | Checkbox        | AnimatedCheckbox    |
| `@repo/ui/kit/sheet`        | Sheet           | AnimatedSheet       |
| `@repo/ui/kit/drawer`       | Drawer          | AnimatedDrawer      |
| `@repo/ui/kit/tabs`         | Tabs            | AnimatedTabs        |
| `@repo/ui/kit/toggle`       | Toggle          | AnimatedToggle      |
| `@repo/ui/kit/toggle-group` | ToggleGroup     | AnimatedToggleGroup |
| `@repo/ui/kit/radio-group`  | RadioGroup      | AnimatedRadioGroup  |
| `@repo/ui/kit/skeleton`     | Skeleton        | —                   |
| `@repo/ui/kit/switch`       | Switch          | AnimatedSwitch      |
| `@repo/ui/kit/calendar`     | Calendar        | —                   |
| `@repo/ui/kit/empty`        | Empty           | —                   |
| `@repo/ui/kit/item`         | Item            | —                   |
| `@repo/ui/kit/input-group`  | InputGroup      | —                   |
| `@repo/ui/kit/input-otp`    | InputOTP        | AnimatedInputOTP    |
| `@repo/ui/kit/input`        | Input           | —                   |
| `@repo/ui/kit/textarea`     | Textarea        | —                   |
| `@repo/ui/kit/badge`        | Badge           | —                   |
| `@repo/ui/kit/card`         | Card            | —                   |
| `@repo/ui/kit/club-card`    | ClubCard        | —                   |
| `@repo/ui/kit/label`        | Label           | —                   |
| `@repo/ui/kit/separator`    | Separator       | —                   |
| `@repo/ui/kit/accordion`    | Accordion       | AnimatedAccordion   |
| `@repo/ui/kit/table`        | Table           | —                   |
| `@repo/ui/kit/data-table`   | DataTable       | —                   |

Animate UI coverage was checked against installed `@animate-ui/react@2.4.2`.
Input, Textarea, Badge, Card, Label, Separator, Table, and DataTable have no matching primitive;
generic visual effects are not treated as component counterparts.
Skeleton uses a CSS pulse gated by `motion-safe`, with no separate animated
counterpart. Sheet uses the Dialog primitive's `data-side` edge-slide support;
Drawer uses Base UI's swipe and snap-point behavior.

Compound names include the family prefix, such as `SelectTrigger`, and `AnimatedSelectPopup`. The parent entry exports public
parts and types. Card exports Header, Title, Description, Action, Content, and
Footer with the Card prefix.

## Use a component

```tsx
import Button, { AnimatedButton } from "@repo/ui/kit/button";

<Button size="sm" color="success">
  Save
</Button>;
<AnimatedButton size="sm" color="success">
  Save
</AnimatedButton>;
<Button size="xs" iconOnly aria-label="Add item">
  +
</Button>;
```

Animation is an explicit import choice. Both versions share the same style
recipe. Animate UI handles its own motion and reduced-motion behavior.
Use `AnimateUIProvider` from `@animate-ui/react/provider` to change global tempo.

## Props and theme

| Prop      | Convention                                                                 |
| --------- | -------------------------------------------------------------------------- |
| size      | xs, sm, md, lg, xl; default md                                             |
| color     | neutral, primary, secondary, error, success, warning, info where supported |
| radius    | none, xs, sm, md, lg, xl, 2xl, 3xl, full where supported                   |
| shadow    | none, xs, sm, md, lg, xl where supported                                   |
| variant   | Component-specific appearance, separate from color                         |
| className | One-off overrides, including typography                                    |

Button and Badge use contained/outlined/text appearances. Fields use
outlined/filled; Card uses outlined/elevated/flat.
Layout-only parts do not expose artificial control variants.

Theme sizing tokens own height, padding, gaps, typography, surface insets, and
checkbox/switch metrics. Override scoped `--theme-*` variables to customize
ordinary and animated versions together.

## Compose compound controls

```tsx
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/kit/select";

<Select defaultValue="apple" items={{ apple: "Apple", pear: "Pear" }} name="fruit">
  <SelectTrigger aria-label="Fruit">
    <SelectValue />
  </SelectTrigger>
  <SelectPortal>
    <SelectPositioner sideOffset={8} alignItemWithTrigger={false}>
      <SelectPopup>
        <SelectList>
          <SelectItem value="apple">
            <SelectItemText>Apple</SelectItemText>
            <SelectItemIndicator aria-hidden>✓</SelectItemIndicator>
          </SelectItem>
          <SelectItem value="pear">
            <SelectItemText>Pear</SelectItemText>
          </SelectItem>
        </SelectList>
      </SelectPopup>
    </SelectPositioner>
  </SelectPortal>
</Select>;
```

For animation, use the Animated-prefixed root and all its parts together.
Checkbox needs CheckboxIndicator; Switch needs SwitchThumb.

Sheet and Drawer expose Content, Trigger, Title, Description, Header, Footer,
and Close. Content composes Portal, Overlay, Viewport, and Popup; these parts
are also exported for custom composition. Content accepts `portalProps`,
`overlayProps`, and `viewportProps` for those layers, and forwards remaining
props and its ref to Popup. Sheet Content defaults to `side="right"`, with
left/top/bottom also supported. Drawer uses `swipeDirection` on its root
(down/up/left/right), plus the upstream snap-point props. Use DrawerBody for
scrollable drawer contents.

```tsx
import { RadioGroup, RadioGroupItem } from "@repo/ui/kit/radio-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/kit/sheet";

<Sheet>
  <SheetTrigger>Preferences</SheetTrigger>
  <SheetContent side="right">
    <SheetTitle>Notifications</SheetTitle>
    <SheetDescription>Choose how you receive updates.</SheetDescription>
    <RadioGroup defaultValue="email" name="notifications" aria-label="Notification method">
      <label>
        <RadioGroupItem value="email" /> Email
      </label>
      <label>
        <RadioGroupItem value="sms" /> SMS
      </label>
    </RadioGroup>
    <SheetClose>Close</SheetClose>
  </SheetContent>
</Sheet>;
```

RadioGroupItem includes its indicator by default; RadioGroupIndicator is exported
for custom composition. Toggle exposes `pressed`, `defaultPressed`, and
`onPressedChange`. ToggleGroup uses an array of values and `multiple` to allow
several selections; compose it with ToggleGroupItem. Tabs uses List, Trigger,
and Content, with values linking each trigger and panel. AnimatedTabsList
provides the moving selection highlight automatically, and AnimatedTabsContent
animates panel changes. Use the full Animated family together.

Skeleton is decorative and hidden from assistive technology by default. Give
its containing loading region a meaningful status label, and reserve its
dimensions with `className` so loading content does not shift the layout.

Base UI families preserve `render`, refs, state-aware className, forms,
and controlled/uncontrolled props. Button supports Radix-style `asChild`.
Provide accessible labels and use `name` where form submission needs a value.

Wrap consumers in `DirectionProvider` from `@repo/ui/direction-provider` with
the document direction. The website and Storybook already do this.

## Source organization

```text
ComponentName/
  ComponentName.tsx
  ComponentName.styles.ts
  ComponentName.types.ts
  ComponentName.storybook.tsx
  AnimatedComponentName/
    AnimatedComponentName.tsx
    AnimatedComponentName.styles.ts
    AnimatedComponentName.types.ts
    AnimatedComponentName.storybook.tsx
    index.ts
  index.ts
```

Compound parts are sibling files within the family folder. For example:

```text
Card/
  Card.tsx
  CardTitle.tsx
  CardTitle.types.ts
  CardHeader.tsx
  CardHeader.types.ts
  Card.styles.ts
  Card.types.ts
  Card.storybook.tsx
  index.ts
```

The family `.styles.ts` exports one tailwind-variants slots recipe (for example,
`cardSlots` with root, header, title, content, action, description, and footer).
Existing per-part recipe names remain compatibility helpers over those slots.
Animated families share the same recipe and keep their parts as sibling files
inside the animated family folder. Transparent headless roots retain upstream
inference and may omit styles. See [AGENTS.md](AGENTS.md) and the
[addition workflow](../../docs/adding-kit-components.md).

## Review and migration

Use [Storybook](../../apps/storybook/README.md) for variants, keyboard stories,
both directions, and reduced motion. Builds compile stories without executing
their play functions.

Old size=`default` becomes `md`; size=`icon` becomes `iconOnly` plus size.
Input uses `size` instead of `controlSize`; native numeric width is `htmlSize`.
Label's old color=`default` becomes `neutral`.

Keep [third-party notices](THIRD_PARTY_NOTICES.md) with adapted source.

- Field: field layout, labels, descriptions and fieldsets (@repo/ui/kit/field). Animate UI has no Field counterpart.
