# Prettier configuration

The root `prettier.config.mjs` applies this shared Prettier 3 configuration
to all workspaces.

## Commands

```sh
npm run format
npm run format:check
```

The first command rewrites files; the second checks them.
Generated files and the npm lockfile are excluded by `.prettierignore`.

## Defaults

Two spaces, semicolons, double quotes, trailing commas, a 100-column print width,
and LF line endings. Imports are sorted using `@ianvs/prettier-plugin-sort-imports`;
class order is preserved.
Intentional multiline objects remain expanded.

Imports are grouped as types, Node built-ins, third-party dependencies, workspace
aliases, and relative modules, with a blank line between groups. Side-effect
imports retain their execution order and act as sorting barriers.
ESLint also requires one blank line after imports, before components or other code.

To reuse the preset in another project, install `@repo/prettier-config` and
`prettier` as development dependencies:

```js
export { default } from "@repo/prettier-config";
```

See [development](../../docs/development.md) for the complete check workflow.
