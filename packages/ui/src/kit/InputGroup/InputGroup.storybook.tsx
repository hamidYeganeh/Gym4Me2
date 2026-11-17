import type { Meta, StoryObj } from "@storybook/react";

import InputGroup, {
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "./index";

const meta = {
  title: "Kit/InputGroup",
  component: InputGroup,
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>https://</InputGroupAddon>
      <InputGroupInput aria-label="Website" placeholder="example.com" />
      <InputGroupAddon align="inline-end">.com</InputGroupAddon>
    </InputGroup>
  ),
} satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Disabled: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput aria-label="Website" disabled placeholder="Unavailable" />
      <InputGroupAddon>.com</InputGroupAddon>
    </InputGroup>
  ),
};
export const Invalid: Story = {
  render: () => (
    <InputGroup>
      <InputGroupInput aria-label="Website" aria-invalid placeholder="Enter a valid website" />
      <InputGroupAddon>.com</InputGroupAddon>
    </InputGroup>
  ),
};
export const Multiline: Story = {
  render: () => (
    <InputGroup>
      <InputGroupTextarea aria-label="Message" placeholder="Write a message" />
      <InputGroupAddon align="block-end">
        <InputGroupButton>Send</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
