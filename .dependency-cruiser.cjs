/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-i18n-to-visual-packages",
      comment:
        "Translation infrastructure must not depend on visual components or theme providers.",
      severity: "error",
      from: { path: "^packages/i18n/" },
      to: { path: "^packages/(ui|theme)/" },
    },
    {
      name: "no-frontend-to-storybook",
      severity: "error",
      from: { path: "^apps/(admin|application|business)/" },
      to: { path: "^apps/storybook/" },
    },
    {
      name: "no-storybook-to-frontend",
      severity: "error",
      from: { path: "^apps/storybook/" },
      to: { path: "^apps/(admin|application|business)/" },
    },
    {
      name: "no-ui-to-i18n",
      comment: "Product copy is supplied by applications, not owned by the UI kit.",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^packages/i18n/" },
    },
    {
      name: "no-theme-to-ui-or-i18n",
      severity: "error",
      from: { path: "^packages/theme/" },
      to: { path: "^packages/(ui|i18n)/" },
    },
    {
      name: "no-production-to-stories",
      severity: "error",
      from: { pathNot: "(\\.storybook\\.|^apps/storybook/)" },
      to: { path: "\\.storybook\\." },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-packages-to-apps",
      comment: "Shared packages must not depend on application code.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "^apps/application/(android|ios)/|(^|/)(node_modules|\\.next|\\.turbo|dist|build|storybook-static|coverage|out)/|\\.tsbuildinfo$|(^|/)next-env\\.d\\.ts$",
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
