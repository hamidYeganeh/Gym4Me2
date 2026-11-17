import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import Button from "../../../kit/Button/Button";
import {
  AnimatedDrawer,
  AnimatedDrawerClose,
  AnimatedDrawerContent,
  AnimatedDrawerDescription,
  AnimatedDrawerFooter,
  AnimatedDrawerHeader,
  AnimatedDrawerTitle,
  AnimatedDrawerTrigger,
} from "./index";

const meta = {
  title: "Animated/Drawer",
  component: AnimatedDrawer,
  args: { defaultOpen: false },
  render: (args) => (
    <AnimatedDrawer {...args}>
      <AnimatedDrawerTrigger render={<Button />}>Open drawer</AnimatedDrawerTrigger>
      <AnimatedDrawerContent>
        <AnimatedDrawerHeader>
          <AnimatedDrawerTitle>Preferences</AnimatedDrawerTitle>
          <AnimatedDrawerDescription>Change how you receive updates.</AnimatedDrawerDescription>
        </AnimatedDrawerHeader>
        <label className="grid gap-theme-2 text-theme-body2 font-theme-medium">
          Display name
          <input
            className="rounded-theme-md border border-theme-input bg-theme-background p-theme-2"
            defaultValue="Alex"
          />
        </label>
        <AnimatedDrawerFooter>
          <AnimatedDrawerClose>Close</AnimatedDrawerClose>
        </AnimatedDrawerFooter>
      </AnimatedDrawerContent>
    </AnimatedDrawer>
  ),
} satisfies Meta<typeof AnimatedDrawer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const InitiallyOpen: Story = { args: { defaultOpen: true } };
export const Left: Story = { args: { swipeDirection: "left" } };
export const Right: Story = { args: { swipeDirection: "right" } };
export const Top: Story = { args: { swipeDirection: "up" } };
export const SnapPoints: Story = { args: { snapPoints: [0.5, 0.9], defaultSnapPoint: 0.5 } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open drawer" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await body.findByRole("dialog", { name: "Preferences" });
    await expect(dialog).toBeVisible();
    await waitFor(() =>
      expect(dialog).toContainElement(canvasElement.ownerDocument.activeElement as HTMLElement),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(body.queryByRole("dialog")).not.toBeInTheDocument());
  },
};
