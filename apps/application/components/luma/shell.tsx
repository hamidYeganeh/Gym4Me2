"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { PageTransitions } from "@repo/ui/page-transitions";
import { applicationRouteLayout } from "../../lib/navigation-route";
import { commitAppRoute, performAppBack } from "../../lib/app-navigation";
import { handlesBackLink } from "../../lib/back-link";
import { LumaNavigation } from "./common";
function ResolvedShell({ children }: { children: ReactNode }) {
  const router = useRouter(),
    t = useTranslations();
  const backLabels = new Set([
    t("Privacy.back"),
    t("Clubs.back"),
    t("CoachDetail.back"),
    t("DiscoveryMap.back"),
    t("Luma.back"),
  ]);
  const path = usePathname().replace(/\/$/, "") || "/";
  const search = useSearchParams();
  const { logical, navigationVisible } = applicationRouteLayout(
    path,
    search.toString(),
  );
  const query = search.toString();
  useEffect(() => commitAppRoute(path, query), [path, query]);
  return (
    <div
      className="luma-shell"
      data-luma-navigation={navigationVisible || undefined}
      onClickCapture={(event) => {
        const anchor =
          event.target instanceof Element ? event.target.closest("a") : null;
        if (!anchor || anchor.closest('[inert], [aria-hidden="true"]')) return;
        const href = anchor.getAttribute("href");
        // Adapt existing accessible Back affordances without changing protected kit DOM.
        if (
          handlesBackLink(
            event,
            {
              href,
              label: anchor.getAttribute("aria-label"),
              inHeader: !!anchor.closest("header,nav"),
              target: anchor.getAttribute("target"),
              download: anchor.hasAttribute("download"),
            },
            backLabels,
          ) &&
          performAppBack(router, href)
        )
          event.preventDefault();
      }}
    >
      <PageTransitions routeId={logical}>{children}</PageTransitions>
      {navigationVisible && <LumaNavigation />}
    </div>
  );
}
export function LumaShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <ResolvedShell>{children}</ResolvedShell>
    </Suspense>
  );
}
