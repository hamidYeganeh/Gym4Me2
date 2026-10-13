import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default tseslint.config(
  { ignores: ["node_modules/**", "assets/**", "src/icons/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
