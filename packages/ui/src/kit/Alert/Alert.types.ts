import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { alertVariants } from "./Alert.styles";
export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants>;

export type AlertTitleProps = React.ComponentProps<"div">;

export type AlertDescriptionProps = React.ComponentProps<"div">;

export type AlertActionProps = React.ComponentProps<"div">;

export type AlertVariants = VariantProps<typeof alertVariants>;
