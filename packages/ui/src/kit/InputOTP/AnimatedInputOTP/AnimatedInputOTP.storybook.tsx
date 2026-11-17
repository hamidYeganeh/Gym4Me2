import { useRef } from "react";
import { expect, userEvent, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import {
  AnimatedInputOTP,
  AnimatedInputOTPGroup,
  AnimatedInputOTPSeparator,
  AnimatedInputOTPSlot,
} from "./index";

const meta = {
  title: "Kit/AnimatedInputOTP",
  component: AnimatedInputOTP,
  args: { maxLength: 6, children: null, "aria-label": "Verification code" },
  render: ({ render: _render, ...args }) => (
    <AnimatedInputOTP {...args}>
      <AnimatedInputOTPGroup>
        {[0, 1, 2].map((index) => (
          <AnimatedInputOTPSlot key={index} index={index} />
        ))}
      </AnimatedInputOTPGroup>
      <AnimatedInputOTPSeparator />
      <AnimatedInputOTPGroup>
        {[3, 4, 5].map((index) => (
          <AnimatedInputOTPSlot key={index} index={index} />
        ))}
      </AnimatedInputOTPGroup>
    </AnimatedInputOTP>
  ),
} satisfies Meta<typeof AnimatedInputOTP>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, value: "123456" } };
export const Invalid: Story = { args: { "aria-invalid": true } };

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Verification code" });
    await userEvent.click(input);
    await userEvent.keyboard("123456");
    await expect(input).toHaveValue("123456");
    await userEvent.keyboard("{Backspace}");
    await expect(input).toHaveValue("12345");
  },
};

export const Placeholder: Story = {
  args: { placeholder: "------" },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Verification code" });
    const slots = canvasElement.querySelectorAll('[data-slot="input-otp-slot"]');
    await expect(slots).toHaveLength(6);
    for (const slot of slots) await expect(slot).toHaveTextContent("-");
    await userEvent.type(input, "1");
    await expect(slots[0]).toHaveTextContent("1");
    for (const slot of [...slots].slice(1)) await expect(slot.textContent).toBe("");
  },
};

export const RefFocus: Story = {
  render: function RefFocusExample() {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <>
        <button type="button" onClick={() => ref.current?.focus()}>
          Focus code
        </button>
        <AnimatedInputOTP ref={ref} maxLength={1} aria-label="Verification code">
          <AnimatedInputOTPGroup>
            <AnimatedInputOTPSlot index={0} />
          </AnimatedInputOTPGroup>
        </AnimatedInputOTP>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Focus code" }));
    await expect(canvas.getByRole("textbox", { name: "Verification code" })).toHaveFocus();
  },
};
