import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const stylesDir = fileURLToPath(new URL("./styles", import.meta.url));
const tokensDir = join(stylesDir, "tokens");

type Block = Map<string, string>;

/** Reads `--name: value;` declarations from the `:root` and dark blocks of one stylesheet. */
const readBlocks = (css: string): { light: Block; dark: Block } => {
  const light: Block = new Map();
  const dark: Block = new Map();
  const blocks = /([^{}]+)\{([^{}]*)\}/g;

  for (const [, selector = "", body = ""] of css.matchAll(blocks)) {
    const target =
      /\.dark|data-theme="dark"/.test(selector) ? dark
      : /:root\s*$/.test(selector.trim()) ? light
      : undefined;
    if (!target) continue;

    for (const [, name = "", value = ""] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      target.set(name, value.trim());
    }
  }

  return { light, dark };
};

const tokenFiles = readdirSync(tokensDir).filter((file) => file.endsWith(".css"));
const light: Block = new Map();
const dark: Block = new Map();
for (const file of tokenFiles) {
  const blocks = readBlocks(readFileSync(join(tokensDir, file), "utf8"));
  blocks.light.forEach((value, name) => light.set(name, value));
  blocks.dark.forEach((value, name) => dark.set(name, value));
}

const colors = readBlocks(readFileSync(join(tokensDir, "colors.css"), "utf8"));
const primitives = readBlocks(readFileSync(join(tokensDir, "primitives.css"), "utf8"));
const tailwind = readFileSync(join(stylesDir, "tailwind.css"), "utf8");

const referenced = (text: string): string[] => [
  ...new Set([...text.matchAll(/var\((--theme-[\w-]+)/g)].map((match) => match[1] ?? "")),
];

/** Follows var() references until a literal colour; dark values fall back to light ones. */
const resolve = (name: string, mode: "light" | "dark", depth = 0): string => {
  if (depth > 10) throw new Error(`Token cycle at ${name}`);
  const value = (mode === "dark" ? dark.get(name) : undefined) ?? light.get(name);
  if (!value) throw new Error(`${name} is not defined`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] ? resolve(reference[1], mode, depth + 1) : value;
};

const luminance = (hex: string): number => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Expected a #rrggbb colour, got ${hex}`);
  const channels = [0, 2, 4].map((start) => parseInt(match[1]!.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
};

describe("theme tokens", () => {
  it("defines every token that Tailwind maps", () => {
    const missing = referenced(tailwind).filter((name) => !light.has(name));
    expect(missing).toEqual([]);
  });

  it("points semantic colours only at defined primitives", () => {
    const css = readFileSync(join(tokensDir, "colors.css"), "utf8");
    const missing = referenced(css).filter(
      (name) => name.startsWith("--theme-ref-") && !primitives.light.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("keeps literal colours out of the semantic layer", () => {
    const literal = [...colors.light, ...colors.dark].filter(
      ([, value]) => !value.startsWith("var(") && !/^(light|dark)$/.test(value),
    );
    expect(literal).toEqual([]);
  });

  it("defines the same colour roles in light and dark", () => {
    const names = (block: Block) =>
      [...block.keys()].filter((name) => name.startsWith("--theme-color-")).sort();
    expect(names(colors.dark)).toEqual(names(colors.light));
  });

  const pairs: [foreground: string, background: string][] = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["muted-foreground", "background"],
    ["muted-foreground", "surface-soft"],
    ["muted-foreground", "card"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["tertiary-foreground", "tertiary"],
    ["accent", "background"],
    ["accent", "surface-soft"],
    ["accent-foreground", "accent"],
    ["surface-dark-foreground", "surface-dark"],
    ["surface-dark-muted-foreground", "surface-dark"],
    ["navy-foreground", "navy"],
    ["destructive-foreground", "destructive"],
    ["success-foreground", "success"],
    ["warning-foreground", "warning"],
    ["warning-text", "background"],
    ["info-foreground", "info"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-primary-foreground", "sidebar-primary"],
  ];

  for (const mode of ["light", "dark"] as const) {
    it.each(pairs)(`${mode}: %s on %s meets WCAG AA (4.5:1)`, (foreground, background) => {
      const ratio = contrast(
        resolve(`--theme-color-${foreground}`, mode),
        resolve(`--theme-color-${background}`, mode),
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("uses #040a14 for the dark app canvas", () => {
    expect(resolve("--theme-color-background", "dark")).toBe("#040a14");
  });

  const darkContrastChecks = [
    ["muted-foreground", "popover", 4.5],
    ["muted-foreground", "secondary", 4.5],
    ["destructive", "card", 4.5],
    ["warning-text", "card", 4.5],
    ["input", "card", 3],
    ["input", "popover", 3],
    ["ring", "popover", 3],
    ["chart-1", "card", 3],
    ["chart-2", "card", 3],
    ["chart-3", "card", 3],
    ["chart-4", "card", 3],
    ["chart-5", "card", 3],
  ] as const;

  it.each(darkContrastChecks)(
    "dark: %s on %s reaches %s:1 contrast",
    (foreground, background, minimum) => {
      expect(
        contrast(
          resolve(`--theme-color-${foreground}`, "dark"),
          resolve(`--theme-color-${background}`, "dark"),
        ),
      ).toBeGreaterThanOrEqual(minimum);
    },
  );

  it.each(["light", "dark"] as const)("uses Gym4Me green as the %s primary", (mode) => {
    expect(resolve("--theme-color-primary", mode).toLowerCase()).toBe("#20fa6d");
  });
});
