"use client";
import type { ToasterProps } from "./Sonner.types";
import { sonnerStyles } from "./Sonner.styles";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={sonnerStyles.toaster()}
      icons={{
        success: <CircleCheckIcon className={sonnerStyles.toaster2()} />,
        info: <InfoIcon className={sonnerStyles.toaster3()} />,
        warning: <TriangleAlertIcon className={sonnerStyles.toaster4()} />,
        error: <OctagonXIcon className={sonnerStyles.toaster5()} />,
        loading: <Loader2Icon className={sonnerStyles.toaster6()} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
