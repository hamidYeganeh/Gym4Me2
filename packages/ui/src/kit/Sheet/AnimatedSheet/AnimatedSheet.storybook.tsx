import { expect, userEvent, waitFor, within } from "storybook/test";

import type { AnimatedSheetContentProps, AnimatedSheetProps } from "./AnimatedSheet.types";
import type { Meta, StoryObj } from "@storybook/react";

import Button from "../../../kit/Button/Button";
import {
  AnimatedSheet,
  AnimatedSheetClose,
  AnimatedSheetContent,
  AnimatedSheetDescription,
  AnimatedSheetFooter,
  AnimatedSheetHeader,
  AnimatedSheetTitle,
  AnimatedSheetTrigger,
} from "./index";

const Example = (props: AnimatedSheetProps & { side?: AnimatedSheetContentProps["side"] }) => {
  const { side, ...args } = props;
  return (
    <AnimatedSheet {...args}>
      <AnimatedSheetTrigger render={<Button />}>Open sheet</AnimatedSheetTrigger>
      <AnimatedSheetContent side={side}>
        <AnimatedSheetHeader>
          <AnimatedSheetTitle>Preferences</AnimatedSheetTitle>
          <AnimatedSheetDescription>Change how you receive updates.</AnimatedSheetDescription>
        </AnimatedSheetHeader>
        <label className="grid gap-theme-2 text-theme-body2 font-theme-medium">
          Display name
          <input
            className="rounded-theme-md border border-theme-input bg-theme-background p-theme-2"
            defaultValue="Alex"
          />
        </label>
        <AnimatedSheetFooter>
          <AnimatedSheetClose>Close</AnimatedSheetClose>
        </AnimatedSheetFooter>
      </AnimatedSheetContent>
    </AnimatedSheet>
  );
};

const meta = {
  title: "Animated/Sheet",
  component: AnimatedSheet,
  args: { defaultOpen: false },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof AnimatedSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Left: Story = { render: (args) => <Example {...args} side="left" /> };
export const Top: Story = { render: (args) => <Example {...args} side="top" /> };
export const Bottom: Story = { render: (args) => <Example {...args} side="bottom" /> };
export const InitiallyOpen: Story = { args: { defaultOpen: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open sheet" });
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
