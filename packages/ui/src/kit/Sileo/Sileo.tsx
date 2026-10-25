"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { useTheme } from "@repo/theme/provider";
import { Toaster as SileoToaster, sileo } from "sileo";
import "sileo/styles.css";
import "./Sileo.css";

export type ToasterProps = ComponentProps<typeof SileoToaster> & {
  dir?: "ltr" | "rtl" | "auto";
};

function subscribeWidth(notify: () => void) {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
}

// Sileo's SVG canvas is 350px wide. Preserve its geometry on narrow WebViews.
const viewportScale = () =>
  Math.min(1, Math.max(0.5, (window.innerWidth - 32) / 350));

export function Toaster({
  dir = "ltr",
  position,
  offset,
  options,
  theme,
  ...props
}: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const scale = useSyncExternalStore(subscribeWidth, viewportScale, () => 1);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    // Sileo's SVG titles/icons are decorative; announce the actual app message.
    const update = () => {
      element
        .querySelectorAll("svg, [data-layer='prev']")
        .forEach((node) => node.setAttribute("aria-hidden", "true"));
      element
        .querySelectorAll("[data-sileo-button]")
        .forEach((node) => node.setAttribute("role", "button"));
    };
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={host}
      className="gym-sileo"
      dir={dir}
      style={{ "--gym-sileo-scale": scale } as CSSProperties}
      onKeyDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (event.key === " " && target.matches("[data-sileo-button]")) {
          event.preventDefault();
          target.click();
          return;
        }
        if (
          (event.key === "Escape" && target.closest("[data-sileo-toast]")) ||
          ((event.key === "Enter" || event.key === " ") &&
            target.matches("[data-sileo-toast]"))
        ) {
          event.preventDefault();
          event.stopPropagation();
          sileo.clear();
        }
      }}
    >
      <SileoToaster
        theme={theme ?? (resolvedTheme === "dark" ? "dark" : "light")}
        position={position ?? (dir === "rtl" ? "top-left" : "top-right")}
        offset={
          offset ?? {
            top: "calc(1rem + var(--app-safe-top, env(safe-area-inset-top, 0px)))",
            right:
              "calc(1rem + var(--app-safe-right, env(safe-area-inset-right, 0px)))",
            bottom:
              "calc(1rem + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
            left: "calc(1rem + var(--app-safe-left, env(safe-area-inset-left, 0px)))",
          }
        }
        options={{ duration: 5000, fill: "var(--popover)", ...options }}
        {...props}
      />
    </div>
  );
}
