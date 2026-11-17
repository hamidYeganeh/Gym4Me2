import type { emptySlots } from "./Empty.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type EmptyProps = ComponentPropsWithRef<"div">;
export type EmptyHeaderProps = ComponentPropsWithRef<"div">;
export type EmptyMediaProps = ComponentPropsWithRef<"div"> & VariantProps<typeof emptySlots>;
export type EmptyTitleProps = ComponentPropsWithRef<"h3">;
export type EmptyDescriptionProps = ComponentPropsWithRef<"p">;
export type EmptyContentProps = ComponentPropsWithRef<"div">;
