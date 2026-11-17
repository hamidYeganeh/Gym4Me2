import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Badge from "./Badge";

afterEach(cleanup);

describe("Badge", () => {
  it("renders its content in a span", () => {
    render(<Badge color="warning">حالت آزمایشی</Badge>);

    const badge = screen.getByText("حالت آزمایشی");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.dataset.slot).toBe("badge");
  });

  it("renders the child element with asChild", () => {
    render(
      <Badge asChild>
        <a href="/requests">درخواست‌ها</a>
      </Badge>,
    );

    const link = screen.getByRole("link", { name: "درخواست‌ها" });
    expect(link.getAttribute("href")).toBe("/requests");
    expect(link.dataset.slot).toBe("badge");
  });
});
