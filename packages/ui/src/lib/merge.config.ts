/** Teach class merging which theme aliases are sizes, families and weights.
 * Without this, text-theme-body2 can be mistaken for a text color.
 */
export const themeMergeConfig = {
  extend: {
    theme: {
      text: [
        "theme-h1",
        "theme-h2",
        "theme-h3",
        "theme-h4",
        "theme-h5",
        "theme-h6",
        "theme-body1",
        "theme-body2",
        "theme-caption",
        "theme-body-large",
        "theme-title",
        "theme-body-md",
        "theme-label",
        "theme-display",
      ],
      shadow: [
        "theme-none",
        "theme-xs",
        "theme-sm",
        "theme-md",
        "theme-lg",
        "theme-xl",
        "theme-focus",
      ],
      font: ["theme-primary", "theme-fa-primary", "theme-sans", "theme-mono"],
      "font-weight": ["theme-normal", "theme-medium", "theme-semibold", "theme-bold"],
      radius: [
        "theme-none",
        "theme-xs",
        "theme-sm",
        "theme-md",
        "theme-lg",
        "theme-xl",
        "theme-2xl",
        "theme-3xl",
        "theme-full",
        "theme-control",
        "theme-card",
        "theme-panel",
        "theme-pill",
      ],
    },
  },
};
