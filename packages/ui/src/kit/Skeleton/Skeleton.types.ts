import type { VariantProps } from "class-variance-authority";
import type { skeletonVariants } from "./Skeleton.styles";
export type SkeletonProps = React.ComponentProps<"div">;

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
