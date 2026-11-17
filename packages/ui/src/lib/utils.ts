import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import type { ClassValue } from "clsx";

import { themeMergeConfig } from "./merge.config";

const mergeClasses = extendTailwindMerge(themeMergeConfig);

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
}
