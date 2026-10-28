"use client";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type RefObject,
  type ReactNode,
} from "react";
import { PageTransition as AnimatePageTransition } from "./animate-ui/components/page-transition";
import { usePathname } from "next/navigation";
import { Ssgoi, type SsgoiConfig } from "@ssgoi/react";
import { SsgoiRouteBoundary } from "@ssgoi/react/nextjs";
import {
  lumaPush,
  lumaFade,
  lumaInstant,
  lumaSheet,
  lumaClub,
} from "./luma-motion";
import { isolateInactiveRoutes } from "./route-accessibility";
import { rememberClubMotionOrigin } from "./lib/club-motion-origin";
import {
  detailRoutes,
  sheetRoutes,
  surfaceTabs,
  type AppSurface,
} from "./lib/route-motion";

const configFor = (surface: AppSurface): SsgoiConfig => ({
  transitions: [
    {
      on: sheetRoutes,
      priority: 40,
      transition: lumaSheet(),
    },
    {
      on: detailRoutes,
      priority: 10,
      transition: lumaPush(),
    },
    {
      from: surfaceTabs[surface],
      to: surfaceTabs[surface],
      preserveScroll: { from: true, to: true },
      priority: 30,
      transition: lumaFade(),
    },
    {
      from: "/**",
      to: "/discovery/coaches/*",
      priority: 25,
      transition: lumaInstant(),
    },
    {
      from: "/**",
      to: [
        "/discovery/classes/*",
        "/discovery/clubs/*/classess/*",
        "/services/*",
      ],
      priority: 25,
      transition: lumaClub(),
    },
    {
      on: [
        "/discovery/clubs/*/slots",
        "/discovery/clubs/*/reviews",
        "/discovery/clubs/*/gallery",
      ],
      priority: 20,
      transition: lumaPush(),
    },
    {
      from: "/**",
      to: "/discovery/clubs/*",
      priority: 15,
      transition: lumaClub(),
    },
    { on: "/**", priority: -100, transition: lumaFade() },
  ],
});
const configs = Object.fromEntries(
  (["application", "business", "admin"] as const).map((surface) => [
    surface,
    configFor(surface),
  ]),
) as Record<AppSurface, SsgoiConfig>;
const reducedConfigFor = (surface: AppSurface): SsgoiConfig => ({
  transitions: [
    {
      from: surfaceTabs[surface],
      to: surfaceTabs[surface],
      priority: 30,
      preserveScroll: { from: true, to: true },
      transition: lumaInstant(),
    },
    { on: "/**", priority: -100, transition: lumaInstant() },
  ],
});
const reducedConfigs: Record<AppSurface, SsgoiConfig> = {
  application: reducedConfigFor("application"),
  business: reducedConfigFor("business"),
  admin: reducedConfigFor("admin"),
};
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
type ActiveRouteState = {
  element: HTMLDivElement | null;
  refresh?: () => void;
};
const ActiveRoute = createContext<RefObject<ActiveRouteState> | null>(null);
function RouteFrame(props: ComponentPropsWithoutRef<"div">) {
  const active = useContext(ActiveRoute);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!active || !node) return;
      active.current.element = node;
      active.current.refresh?.();
      return () => {
        if (active.current.element === node) active.current.element = null;
      };
    },
    [active],
  );
  return <div {...props} ref={ref} />;
}

export function PageTransitions({
  children,
  routeId,
  surface = "application",
}: {
  children: ReactNode;
  routeId?: string;
  surface?: AppSurface;
}) {
  const pathname = usePathname();
  const coachRoute = (routeId ?? pathname).startsWith("/discovery/coaches/");
  const reduce = useSyncExternalStore(subscribe, getReducedMotion, () => true);
  const root = useRef<HTMLDivElement>(null);
  const active = useRef<ActiveRouteState>({ element: null });
  useLayoutEffect(() => {
    if (surface === "application" || !root.current || !routeId) return;
    const state = active.current;
    const isolation = isolateInactiveRoutes(root.current, () => state.element);
    state.refresh = isolation.sync;
    return () => {
      state.refresh = undefined;
      isolation.dispose();
    };
  }, [routeId, surface]);
  // SSGOI restores tab positions; browser anchoring otherwise shifts the
  // viewport again when the outgoing route finishes leaving the layout.
  return (
    <div
      ref={root}
      onClickCapture={(event) => {
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        )
          rememberClubMotionOrigin(event.target);
      }}
      data-gym-route-motion={reduce ? "reduced" : "full"}
      style={{ overflowAnchor: "none" }}
      className="relative isolate min-h-dvh overflow-x-clip"
    >
      {surface === "application" ? (
        <AnimatePageTransition
          effect={coachRoute ? "zoom" : "fade"}
          pageKey={routeId ?? pathname}
        >
          {children}
        </AnimatePageTransition>
      ) : (
        <Ssgoi config={reduce ? reducedConfigs[surface] : configs[surface]}>
          <ActiveRoute.Provider value={active}>
            <SsgoiRouteBoundary
              as={RouteFrame}
              resolve={
                routeId ? () => ({ id: routeId, key: routeId }) : resolveRoute
              }
            >
              {children}
            </SsgoiRouteBoundary>
          </ActiveRoute.Provider>
        </Ssgoi>
      )}
    </div>
  );
}
