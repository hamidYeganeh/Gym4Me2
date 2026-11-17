import tailwindcss from "@tailwindcss/vite";

import type { StorybookConfig } from "@storybook/react-vite";
import type { UserConfig } from "vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  staticDirs: [{ from: "../../application/public/images/clubs", to: "/club-images" }],
  stories: ["../../../packages/ui/src/**/*.storybook.tsx"],
  experimental_indexers: async (indexers = []) => {
    const csf = indexers.find((indexer) => indexer.test.test("example.stories.tsx"));

    if (!csf) throw new Error("Storybook CSF indexer is unavailable");

    return [...indexers, { ...csf, test: /\.storybook\.[jt]sx?$/ }];
  },
  addons: ["@storybook/addon-docs"],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");

    return mergeConfig(config, {
      plugins: [
        {
          name: "storybook-client-directives",
          enforce: "pre",
          transform(code, id) {
            if (!/\.[cm]?[jt]sx?(?:\?|$)/.test(id)) return;

            // Storybook is client-only. Remove the directive before transforms
            // leave its position unmapped and Rollup tries to warn about it.
            // Spaces preserve every source position for the remaining code.
            const stripped = code.replace(/^(\s*)(["'])use client\2;?/, (directive) =>
              directive.replace(/[^\r\n]/g, " "),
            );
            if (stripped === code) return;

            return { code: stripped, map: null };
          },
        },
        tailwindcss(),
      ],
      build: {
        rollupOptions: {
          onLog(level, log, handler) {
            if (
              level === "warn" &&
              log.code === "MODULE_LEVEL_DIRECTIVE" &&
              log.message.includes('"use client"')
            ) {
              return;
            }

            handler(level, log);
          },
        },
      },
    } satisfies UserConfig);
  },
};

export default config;
