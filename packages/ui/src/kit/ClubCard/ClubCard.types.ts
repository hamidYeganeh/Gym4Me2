import type { CardProps } from "../Card";
import type { clubCardVariants } from "./ClubCard.styles";
import type { VariantProps } from "tailwind-variants";

export type ClubCardVariants = VariantProps<typeof clubCardVariants> & {
  variant?: "vertical" | "horizontal";
};

export type ClubCardProps = Omit<
  CardProps,
  "children" | "dangerouslySetInnerHTML" | "title" | "variant" | "size" | "radius" | "shadow"
> &
  ClubCardVariants & {
    name: string;
    href?: string;
    image?: { src: string; alt: string };
    price?: string;
    address?: string;
    rating?: { value: string; reviewCount?: string };
    amenities?: readonly string[];
  };
