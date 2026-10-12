"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "@repo/theme/provider";
import { transitionTheme } from "@repo/theme/transition";
import { MoonIcon, SunIcon } from "../../icons";
import { cn } from "../../lib/utils";
import { Button } from "../Button";
import { animatedThemeTogglerStyles } from "./AnimatedThemeToggler.styles";
import type { AnimatedThemeTogglerProps } from "./AnimatedThemeToggler.types";
const subscribe = () => () => {};
export function AnimatedThemeToggler({
  label,
  variant = "circle",
  duration = 400,
  fromCenter,
  className,
  disabled,
  size = "icon",
  ...props
}: AnimatedThemeTogglerProps) {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <Button
      {...props}
      type="button"
      size={size}
      variant="outline"
      className={cn(animatedThemeTogglerStyles(), className)}
      aria-label={label}
      disabled={disabled || !mounted || Boolean(forcedTheme)}
      onClick={(event) => {
        const theme = document.documentElement.classList.contains("dark")
          ? "light"
          : "dark";
        void transitionTheme(
          event.currentTarget,
          () => {
            // Make the new snapshot synchronous; next-themes keeps its subscribers and storage in sync.
            document.documentElement.classList.toggle("dark", theme === "dark");
            document.documentElement.classList.toggle(
              "light",
              theme === "light",
            );
            document.documentElement.style.colorScheme = theme;
            setTheme(theme);
          },
          { variant, duration, fromCenter },
        );
      }}
    >
      {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
