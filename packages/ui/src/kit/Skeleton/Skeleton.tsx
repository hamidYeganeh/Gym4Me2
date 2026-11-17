import type { SkeletonProps } from "./Skeleton.types";
import type { FC } from "react";

import { skeletonVariants } from "./Skeleton.styles";

const Skeleton: FC<SkeletonProps> = (props) => {
  const { className, radius, ...rest } = props;
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={skeletonVariants({ radius, className })}
      {...rest}
    />
  );
};
export default Skeleton;
