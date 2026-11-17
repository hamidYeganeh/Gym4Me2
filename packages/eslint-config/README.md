# ESLint configuration

Shared ESLint 10 flat presets.

| Import                               | Includes                                                                   | Named export |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------ |
| `@repo/eslint-config/base`           | JavaScript, TypeScript, imports, unused variables, Turbo environment rules | config       |
| `@repo/eslint-config/react-internal` | Base plus browser globals and React Hooks                                  | config       |
| `@repo/eslint-config/next-js`        | React plus Node globals and Next.js rules                                  | nextJsConfig |

Export the preset array from a workspace's `eslint.config.mjs`. Put local
overrides after the shared entries.

Run `npm run lint` at the repository root. Warnings fail the check.
Use `npm run lint:fix` for automatic fixes.

Prettier owns import sorting and formatting; `prettier/prettier` exposes the same
configuration as an autofixable ESLint rule. Type-only imports use separate
declarations. `import-x/newline-after-import` requires one blank line between the
last import and components or other code. Presets disable conflicting style rules.
Staged source files run ESLint fixes followed by Prettier formatting automatically.
Prefix intentionally unused arguments with `_`.
Lint does not replace compiler checks; run `npm run check-types` separately.

The lint toolchain uses its own compatible TypeScript version. UI and theme
compiler versions remain independent.

See [development](../../docs/development.md) for validation commands.
