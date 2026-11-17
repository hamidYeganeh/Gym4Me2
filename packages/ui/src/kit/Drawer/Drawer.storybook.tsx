import { expect, userEvent, waitFor, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import Button from "../../kit/Button/Button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./index";

const meta = {
  title: "Kit/Drawer",
  component: Drawer,
  args: { defaultOpen: false },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button />}>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Preferences</DrawerTitle>
          <DrawerDescription>Change how you receive updates.</DrawerDescription>
        </DrawerHeader>
        <label className="grid gap-theme-2 text-theme-body2 font-theme-medium">
          Display name
          <input
            className="rounded-theme-md border border-theme-input bg-theme-background p-theme-2"
            defaultValue="Alex"
          />
        </label>
        <DrawerFooter>
          <DrawerClose>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
} satisfies Meta<typeof Drawer>;
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
