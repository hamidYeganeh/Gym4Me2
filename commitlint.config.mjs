export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "storybook",
        "admin",
        "application",
        "business",
        "backend",
        "i18n",
        "theme",
        "kit",
        "deps",
        "docs",
        "repo",
      ],
    ],
    "scope-empty": [2, "never"],
    "header-max-length": [2, "always", 100],
  },
};
