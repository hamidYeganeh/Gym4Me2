import type { Meta, StoryObj } from "@storybook/react";

import ClubCard from "./index";

const meta = {
  title: "Kit/ClubCard",
  component: ClubCard,
  args: {
    className: "max-w-sm",
    name: "FORM Fitness Club",
    image: {
      src: "./club-images/training-floor.jpg",
      alt: "Gym floor with strength machines and free weights",
    },
    price: "2,400,000 toman / month",
    address: "Jordan, Tehran",
    rating: { value: "4.8", reviewCount: "20" },
    amenities: ["Strength training", "Group classes", "Locker rooms"],
  },
} satisfies Meta<typeof ClubCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = { args: { orientation: "vertical" } };

export const Horizontal: Story = {
  args: { variant: "horizontal", href: "/clubs/form-fitness" },
};

export const CoverAndName: Story = {
  args: { price: undefined, address: undefined, rating: undefined, amenities: undefined },
};
