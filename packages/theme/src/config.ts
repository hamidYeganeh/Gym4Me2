import type { ThemeProviderProps } from "next-themes";

export const defaultTheme = "dark";
export const themes = ["light", "dark"];
export const attribute = "class";

export const configs = {
  defaultTheme,
  themes,
  attribute,
  enableSystem: false,
  disableTransitionOnChange: true,
} satisfies Omit<ThemeProviderProps, "children">;
