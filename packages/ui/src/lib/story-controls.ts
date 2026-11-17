export const sizeControl = {
  control: "select",
  options: ["xs", "sm", "md", "lg", "xl"],
} as const;

export const colorControl = {
  control: "select",
  options: ["neutral", "primary", "secondary", "error", "success", "warning", "info"],
} as const;

export const radiusControl = {
  control: "select",
  options: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"],
} as const;

export const shadowControl = {
  control: "select",
  options: ["none", "xs", "sm", "md", "lg", "xl"],
} as const;
