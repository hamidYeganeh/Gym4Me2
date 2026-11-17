import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional classes", () => {
    const hidden = false;

    expect(
      cn("flex", hidden && "hidden", undefined, ["gap-2", { "p-4": true, "m-4": false }]),
    ).toBe("flex gap-2 p-4");
  });

  it("keeps the last of two conflicting Tailwind classes", () => {
    expect(cn("p-2 text-sm", "p-4")).toBe("text-sm p-4");
  });

  it("treats theme text sizes as sizes, not colors", () => {
    expect(cn("text-theme-body1 text-theme-primary", "text-theme-caption")).toBe(
      "text-theme-primary text-theme-caption",
    );
  });

  it("merges theme radius aliases", () => {
    expect(cn("rounded-theme-sm", "rounded-theme-lg")).toBe("rounded-theme-lg");
  });

  it("treats the new theme text styles as sizes", () => {
    expect(cn("text-theme-label text-theme-accent", "text-theme-body-md")).toBe(
      "text-theme-accent text-theme-body-md",
    );
  });

  it("merges semantic radius and shadow aliases", () => {
    expect(cn("rounded-theme-md", "rounded-theme-card")).toBe("rounded-theme-card");
    expect(cn("shadow-theme-sm", "shadow-theme-focus")).toBe("shadow-theme-focus");
  });
});
