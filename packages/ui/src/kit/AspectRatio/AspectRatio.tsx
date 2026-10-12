"use client";
import type { AspectRatioProps } from "./AspectRatio.types";

import { AspectRatio as AspectRatioPrimitive } from "radix-ui";

function AspectRatio({ ...props }: AspectRatioProps) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
