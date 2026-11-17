import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";

import { config as baseConfig } from "./base.js";

/** React libraries: browser globals and the recommended React Hooks rules. */
export const config = defineConfig([
  ...baseConfig,
  {
    name: "repo/react",
    files: ["**/*.{jsx,tsx,js,ts}"],
    extends: [pluginReactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration[id.name=/^[A-Z]/]",
          message:
            "Define components as const arrow functions and destructure props inside the body.",
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
