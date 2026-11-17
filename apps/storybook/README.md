# Storybook

The shared UI component workshop.

## Run

From the repository root:

```sh
npm run storybook
npm run build:storybook
```

Open [localhost:6006](http://localhost:6006). Static output is written to
`apps/storybook/storybook-static`.

## Review

Stories are discovered from `packages/ui/src/**/*.storybook.tsx`, including
nested animated implementations. Use the toolbar for light/dark, English/Persian,
and system/reduced motion.

Document language, direction, theme, and DirectionProvider also apply to
portaled controls. Fonts use system fallbacks; check actual fonts in the website.

Run Keyboard stories to check interaction. For motion, inspect transitions,
repeat triggers quickly, and test reduced motion. The toolbar's MotionConfig
and the OS CSS media query are separate mechanisms.

A static build compiles stories but does not run their play functions.
No dedicated browser test runner is configured.

See the [kit catalog](../../packages/ui/README.md) and
[component workflow](../../docs/adding-kit-components.md).
