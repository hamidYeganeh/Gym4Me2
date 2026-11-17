import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "../Input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "./index";

const meta = {
  title: "Kit/Field",
  component: Field,
  render: (args) => (
    <FieldGroup>
      <Field {...args}>
        <FieldLabel htmlFor="class-name">Class name</FieldLabel>
        <Input id="class-name" />
        <FieldDescription>A name members will recognize.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
