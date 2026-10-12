"use client";
import type { DirectionProviderProps } from "./Direction.types";

import { Direction } from "radix-ui";

function DirectionProvider({
  dir,
  direction,
  children,
}: DirectionProviderProps) {
  return (
    <Direction.DirectionProvider dir={direction ?? dir}>
      {children}
    </Direction.DirectionProvider>
  );
}

const useDirection = Direction.useDirection;

export { DirectionProvider, useDirection };
