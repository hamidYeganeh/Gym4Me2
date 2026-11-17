import type { skeletonVariants } from "./Skeleton.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
export type SkeletonProps = ComponentPropsWithRef<"div"> & SkeletonVariants;
