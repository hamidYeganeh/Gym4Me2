import { config } from "@repo/eslint-config/react-internal";

export default [
  ...config,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "apps/*", "**/apps/**"],
              message:
                "Shared package boundaries must not depend on application or higher-level packages.",
            },
          ],
        },
      ],
    },
  },
];
