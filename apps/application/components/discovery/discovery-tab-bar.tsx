"use client";

import Link from "next/link";
import "./discovery-tab-bar.css";
import { usePathname } from "next/navigation";
import { Bookmark, Home, Map, UserRound } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { cn } from "@repo/ui/lib/utils";

export function DiscoveryTabBar() {
  const pathname = usePathname();
  const t = useTranslations("DiscoveryTabs");
  const tabs = [
    {
      href: "/discovery",
      label: t("home"),
      icon: Home,
      active: pathname === "/" || pathname === "/discovery",
    },
    {
      href: "/discovery/map",
      label: t("map"),
      icon: Map,
      active: pathname === "/discovery/map",
    },
    {
      href: "/saved",
      label: t("saved"),
      icon: Bookmark,
      active: pathname.startsWith("/saved"),
    },
    {
      href: "/profile",
      label: t("profile"),
      icon: UserRound,
      active: pathname.startsWith("/profile"),
    },
  ];
  return (
    <nav aria-label={t("navigation")} className="discovery-tab-bar">
      <div className="discovery-tab-bar-backdrop" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative grid grid-cols-4 gap-2">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon
              className="size-6"
              fill={active ? "currentColor" : "none"}
              aria-hidden="true"
            />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
