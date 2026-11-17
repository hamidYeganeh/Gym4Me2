import { expect, userEvent, waitFor, within } from "storybook/test";

import type { SheetContentProps, SheetProps } from "./Sheet.types";
import type { Meta, StoryObj } from "@storybook/react";

import Button from "../../kit/Button/Button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./index";

const Example = (props: SheetProps & { side?: SheetContentProps["side"] }) => {
  const { side, ...args } = props;
  return (
    <Sheet {...args}>
      <SheetTrigger render={<Button />}>Open sheet</SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Preferences</SheetTitle>
          <SheetDescription>Change how you receive updates.</SheetDescription>
        </SheetHeader>
        <label className="grid gap-theme-2 text-theme-body2 font-theme-medium">
          Display name
          <input
            className="rounded-theme-md border border-theme-input bg-theme-background p-theme-2"
            defaultValue="Alex"
          />
        </label>
        <SheetFooter>
          <SheetClose>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const meta = {
  title: "Kit/Sheet",
  component: Sheet,
  args: { defaultOpen: false },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof Sheet>;
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
