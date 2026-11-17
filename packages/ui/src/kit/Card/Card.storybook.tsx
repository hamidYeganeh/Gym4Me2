import type { Meta, StoryObj } from "@storybook/react";

import { radiusControl, shadowControl, sizeControl } from "../../lib/story-controls";
import Button from "../Button/Button";
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./index";

const meta = {
  title: "Kit/Card",
  component: Card,
  args: { className: "max-w-sm", variant: "outlined", radius: "xl", size: "md" },
  argTypes: {
    shadow: shadowControl,
    variant: { control: "select", options: ["outlined", "elevated", "flat"] },
    radius: radiusControl,
    size: sizeControl,
  },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>Manage your workspace preferences.</CardDescription>
      </CardHeader>
      <CardContent>Compose the card parts to fit your content.</CardContent>
      <CardFooter>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Elevated: Story = { args: { variant: "elevated" } };
export const Compact: Story = { args: { size: "sm", radius: "sm" } };
