"use client";

import { DirectionProvider as Primitive } from "@base-ui/react/direction-provider";

import type { DirectionProviderProps } from "./DirectionProvider.types";
import type { FC } from "react";

const DirectionProvider: FC<DirectionProviderProps> = (props) => {
  const { children, ...rest } = props;

  return <Primitive {...rest}>{children}</Primitive>;
};

export default DirectionProvider;
