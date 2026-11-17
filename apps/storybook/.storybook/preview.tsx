import type { Preview } from "@storybook/react-vite";

import "../src/styles.css";

import PreviewFrame from "./PreviewFrame.js";

const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: {
    motion: { toolbar: { icon: "play", items: ["system", "reduced"] } },
    theme: { toolbar: { icon: "circlehollow", items: ["light", "dark"] } },
    locale: { toolbar: { icon: "globe", items: ["en", "fa"] } },
  },
  initialGlobals: { theme: "dark", locale: "fa", motion: "system" },
  parameters: { layout: "padded", controls: { expanded: true } },
  decorators: [
    (Story, context) => (
      <PreviewFrame
        motion={context.globals.motion === "reduced" ? "reduced" : "system"}
        theme={context.globals.theme === "dark" ? "dark" : "light"}
        locale={context.globals.locale === "fa" ? "fa" : "en"}
      >
        <Story />
      </PreviewFrame>
    ),
  ],
};

export default preview;
