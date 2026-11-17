import { expect, userEvent, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import Calendar from "./Calendar";

const meta = {
  title: "Kit/Calendar",
  component: Calendar,
  args: { defaultMonth: new Date(2026, 10, 1) },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Single: Story = { args: { mode: "single" } };
export const Range: Story = { args: { mode: "range", numberOfMonths: 2 } };
export const Multiple: Story = { args: { mode: "multiple" } };
export const Disabled: Story = { args: { mode: "single", disabled: true } };

export const RTLNavigation: Story = {
  args: { mode: "single", dir: "rtl" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const previous = canvas.getByRole("button", { name: /previous month/i });
    const next = canvas.getByRole("button", { name: /next month/i });
    // DayPicker already reverses the chevrons in RTL; a second rotation cancels that.
    await expect(getComputedStyle(previous).transform).toBe("none");
    await expect(getComputedStyle(next).transform).toBe("none");
    await expect(canvas.getByText("November 2026")).toBeVisible();
    await userEvent.click(next);
    await expect(canvas.getByText("December 2026")).toBeVisible();
    await userEvent.click(previous);
    await expect(canvas.getByText("November 2026")).toBeVisible();
  },
};
