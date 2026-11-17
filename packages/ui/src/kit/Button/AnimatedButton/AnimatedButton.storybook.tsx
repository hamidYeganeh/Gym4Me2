import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react";

import { radiusControl, shadowControl, sizeControl } from "../../../lib/story-controls";
import PrimitiveButton from "../Button";
import Button from "./AnimatedButton";

const onFormSubmit = fn();

const variants = ["contained", "outlined", "text"] as const;
const colors = ["neutral", "primary", "secondary", "error", "success", "warning", "info"] as const;
const meta = {
  title: "Animated/Button",
  component: Button,
  args: { children: "Button", variant: "contained", color: "primary" },
  argTypes: {
    shadow: shadowControl,
    radius: radiusControl,
    variant: { control: "select", options: variants },
    color: { control: "select", options: colors },
    size: sizeControl,
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Contained: Story = {};
export const ApplyPage: Story = {
  render: () => (
    <div lang="fa" dir="rtl" className="flex flex-wrap items-center gap-theme-3">
      <Button variant="outlined">ورود / ثبت نام</Button>
      <Button>تماس با ما</Button>
      <Button size="xl" className="text-theme-body2">
        ثبت درخواست
      </Button>
      <Button disabled>ثبت درخواست</Button>
    </div>
  ),
};
export const Outlined: Story = { args: { variant: "outlined" } };
export const Text: Story = { args: { variant: "text" } };
export const Error: Story = { args: { variant: "contained", color: "error" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const Icon: Story = {
  args: {
    size: "md",
    iconOnly: true,
    children: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" stroke="currentColor" />
      </svg>
    ),
    "aria-label": "Add item",
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Add item" }),
    ).toHaveAccessibleName("Add item");
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Keyboard: Story = {
  args: { onClick: fn(), asChild: false },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
    await expect(button).toHaveFocus();
  },
};
export const AsChild: Story = {
  args: { asChild: true, children: <a href="#button">Continue</a> },
};
export const VariantsAndColors: Story = {
  render: (args) => (
    <div className="flex flex-col gap-theme-stack">
      {variants.map((variant) => (
        <div key={variant} className="flex flex-wrap gap-theme-3">
          {colors.map((color) => (
            <Button {...args} asChild={false} key={color} variant={variant} color={color}>
              {variant} {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
export const Dark: Story = {
  ...VariantsAndColors,
  decorators: [
    (Story) => (
      <div className="dark bg-theme-background p-theme-page text-theme-foreground">
        <Story />
      </div>
    ),
  ],
};
export const Persian: Story = {
  args: { children: "ذخیره تغییرات" },
  decorators: [
    (Story) => (
      <div lang="fa" dir="rtl">
        <Story />
      </div>
    ),
  ],
};

export const Compare: Story = {
  render: () => (
    <div className="flex flex-wrap gap-theme-stack">
      <PrimitiveButton>Primitive</PrimitiveButton>
      <Button>Animated: press me</Button>
    </div>
  ),
};

export const CustomRadius: Story = { args: { radius: "full" } };
export const CustomClasses: Story = {
  args: { className: "rounded-theme-none text-theme-body-large" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-theme-stack">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Button {...args} asChild={false} key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  args: { children: "Save changes", loading: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Save changes" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const DisabledLink: Story = {
  args: {
    asChild: true,
    disabled: true,
    onClick: fn(),
    children: (
      <a href="#disabled-target" onClick={fn()} onClickCapture={fn()}>
        Continue
      </a>
    ),
  },
  play: async ({ args, canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "Continue" });
    await expect(link).toHaveAttribute("aria-disabled", "true");
    await expect(link).toHaveAttribute("tabindex", "-1");
    await userEvent.click(link);
    link.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(
      (args.children as React.ReactElement<React.HTMLAttributes<HTMLAnchorElement>>).props.onClick,
    ).not.toHaveBeenCalled();
    await expect(
      (args.children as React.ReactElement<React.HTMLAttributes<HTMLAnchorElement>>).props
        .onClickCapture,
    ).not.toHaveBeenCalled();
  },
};

export const LoadingLink: Story = {
  ...DisabledLink,
  args: { ...DisabledLink.args, disabled: false, loading: true },
};

export const FormBehavior: Story = {
  render: () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onFormSubmit();
      }}
    >
      <Button>Cancel</Button>
      <Button type="submit">Submit</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    onFormSubmit.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(onFormSubmit).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
    await expect(onFormSubmit).toHaveBeenCalledTimes(1);
  },
};

export const LoadingWidth: Story = {
  render: function LoadingWidthExample() {
    const [loading, setLoading] = useState(false);
    return (
      <>
        <label>
          <input
            type="checkbox"
            checked={loading}
            onChange={(event) => setLoading(event.target.checked)}
          />
          Loading
        </label>
        <Button loading={loading}>Save changes</Button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Save changes" });
    const width = button.getBoundingClientRect().width;
    await userEvent.click(canvas.getByRole("checkbox", { name: "Loading" }));
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button.getBoundingClientRect().width).toBeCloseTo(width, 1);
    await expect(button).toHaveAccessibleName("Save changes");
  },
};

export const IconSizes: Story = {
  render: () => (
    <div className="flex items-center gap-theme-2">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Button key={size} size={size} iconOnly aria-label={size}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke="currentColor" />
          </svg>
        </Button>
      ))}
      <Button size="xl" iconOnly aria-label="Custom icon">
        <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="currentColor" />
        </svg>
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const icons = [...canvasElement.querySelectorAll("svg")];
    const widths = icons.map((icon) => icon.getBoundingClientRect().width);
    for (let index = 1; index < 5; index++)
      await expect(widths[index]).toBeGreaterThan(widths[index - 1]!);
    await expect(widths[5]).toBe(32);
  },
};
