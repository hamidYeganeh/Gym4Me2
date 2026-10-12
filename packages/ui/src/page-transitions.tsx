"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { Ssgoi, type SsgoiConfig } from "@ssgoi/react";
import { SsgoiRouteBoundary } from "@ssgoi/react/nextjs";
import { fade, zoom, drill } from "@ssgoi/react/view-transitions";

const config: SsgoiConfig = {
  transitions: [
    {
      on: "/discovery/coaches/*",
      priority: 20,
      transition: drill({ type: "parallax" }),
    },
    {
      on: ["/discovery/clubs/*/slots", "/discovery/clubs/*/reviews"],
      priority: 20,
      transition: drill({ type: "parallax" }),
    },
    ...["/", "/discovery"].map((from) => ({
      from,
      to: "/discovery/clubs/*",
      transition: zoom({ type: "blur", variant: "fade" }),
    })),
    {
      from: "/",
      to: "/training",
      transition: zoom({ type: "blur", variant: "fade" }),
    },
    { on: "/**", priority: -100, transition: fade() },
  ],
};
const reducedConfig: SsgoiConfig = { transitions: [] };
function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const resolveRoute = ({ pathname }: { pathname: string }) => ({
  id: pathname.replace(/\/$/, "") || "/",
});

export function PageTransitions({ children }: { children: ReactNode }) {
  const reduce = useSyncExternalStore(subscribe, getReducedMotion, () => true);
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <Ssgoi config={reduce ? reducedConfig : config}>
        <SsgoiRouteBoundary resolve={resolveRoute}>
          {children}
        </SsgoiRouteBoundary>
      </Ssgoi>
    </div>
  );
}
