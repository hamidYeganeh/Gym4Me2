import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importX from "eslint-plugin-import-x";
import prettierPlugin from "eslint-plugin-prettier";
import turboPlugin from "eslint-plugin-turbo";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"];

export const config = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/.vercel/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/coverage/**",
    "**/storybook-static/**",
    "**/next-env.d.ts",
  ]),
  {
    name: "repo/javascript",
    files: sourceFiles,
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: { turbo: turboPlugin, "import-x": importX, prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "error",
      "import-x/newline-after-import": ["error", { count: 1, considerComments: true }],
      "turbo/no-undeclared-env-vars": "error",
      "no-constant-binary-expression": "error",
      "no-debugger": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    name: "repo/typescript",
    files: ["**/*.{ts,mts,cts,tsx}"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    name: "repo/node",
    files: ["**/*.{js,mjs,cjs,mts,cts}", "**/*.config.{ts,mts,cts}", "**/scripts/**"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.cjs", "**/*.cts"],
    languageOptions: { sourceType: "commonjs" },
  },
  eslintConfigPrettier,
]);
