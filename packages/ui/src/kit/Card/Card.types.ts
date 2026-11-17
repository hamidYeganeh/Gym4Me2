import type { cardVariants } from "./Card.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type CardVariants = VariantProps<typeof cardVariants>;

export type CardProps = ComponentPropsWithRef<"div"> & CardVariants;

export type CardPartProps = ComponentPropsWithRef<"div">;

export type CardActionProps = ComponentPropsWithRef<"div">;

export type CardContentProps = ComponentPropsWithRef<"div">;

export type CardDescriptionProps = ComponentPropsWithRef<"div">;

export type CardFooterProps = ComponentPropsWithRef<"div">;

export type CardHeaderProps = ComponentPropsWithRef<"div">;

export type CardTitleProps = ComponentPropsWithRef<"h3">;
