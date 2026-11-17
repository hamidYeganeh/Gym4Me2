"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import type { ThemeProviderProps } from "./ThemeProvider.types";
import type { FC } from "react";

import { configs } from "../../config";

export const ThemeProvider: FC<ThemeProviderProps> = (props) => {
  const { children, ...rest } = props;

  return (
    <NextThemesProvider {...configs} {...rest}>
      {children}
    </NextThemesProvider>
  );
};

export default ThemeProvider;
