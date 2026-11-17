import type { Meta, StoryObj } from "@storybook/react";

import Item, { ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "./index";

const meta = {
  title: "Kit/Item",
  component: Item,
  render: (args) => (
    <Item {...args}>
      <ItemMedia variant="icon">✓</ItemMedia>
      <ItemContent>
        <ItemTitle>Project saved</ItemTitle>
        <ItemDescription>Your changes are ready.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <button type="button">Open</button>
      </ItemActions>
    </Item>
  ),
} satisfies Meta<typeof Item>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Outlined: Story = { args: { variant: "outlined" } };
export const Muted: Story = { args: { variant: "muted" } };
export const Compact: Story = { args: { size: "sm" } };
