"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { ReactNode } from "react";

import { getLocaleConfig, useLocale } from "@repo/i18n";
import { ArrowSignOut1 } from "@repo/icons/arrow-sign-out-1";
import { Building2 } from "@repo/icons/building-2";
import { Calendar2 } from "@repo/icons/calendar-2";
import { DocumentFold } from "@repo/icons/document-fold";
import { House1 } from "@repo/icons/house-1";
import { MenuGrid1 } from "@repo/icons/menu-grid-1";
import { User } from "@repo/icons/user";
import { Button } from "@repo/ui/kit/button";

import { useApiRequest } from "../../lib/admin-api";
import { PageTransition } from "../../lib/PageTransition";
import { dashboardClasses } from "./dashboard-classes";
import { PanelBreadcrumb } from "./PanelBreadcrumb";

export const PanelLayout = (props: { children: ReactNode }) => {
  const { children } = props;
  const request = useApiRequest();
  const locale = useLocale();
  const fa = locale === "fa";
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(false);
    try {
      const response = await request(["/api/auth/logout", { method: "POST" }]);
      if (!response.ok) throw new Error("Sign-out failed.");
      window.location.replace("/auth");
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }
  const resources = pathname === "/club/resources" || pathname.startsWith("/club/resources/");
  const navigation = [
    { href: "/", label: fa ? "داشبورد" : "Dashboard", icon: House1, active: pathname === "/" },
    {
      href: "/clubs",
      label: fa ? "درخواست‌های باشگاه" : "Club requests",
      icon: Building2,
      active:
        !resources &&
        pathname !== "/club/publications" &&
        (pathname === "/clubs" || pathname === "/club" || pathname.startsWith("/club/")),
    },
    {
      href: "/club/publications",
      label: fa ? "بررسی انتشار" : "Publication review",
      icon: DocumentFold,
      active: pathname === "/club/publications",
    },
    {
      href: "/club/resources",
      label: fa ? "مدیریت منابع" : "Resources",
      icon: MenuGrid1,
      active: resources,
    },
    {
      href: "/classes",
      label: fa ? "کلاس‌ها و رزروها" : "Classes & reservations",
      icon: Calendar2,
      active: pathname.startsWith("/classes") || pathname.startsWith("/reservations"),
    },
    {
      href: "/users",
      label: fa ? "کاربران" : "Users",
      icon: User,
      active: pathname === "/users" || pathname.startsWith("/users/"),
    },
  ];
  const signOutLabel = fa ? "خروج از پنل" : "Sign out";
  const contentClass =
    "min-w-0 min-h-dvh md:ms-56 max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))]";
  return (
    <div {...getLocaleConfig(locale)} className={dashboardClasses.shell}>
      <a
        href="#panel-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-800 focus:p-3"
      >
        {fa ? "رفتن به محتوا" : "Skip to content"}
      </a>
      <aside className="fixed inset-x-0 bottom-0 z-10 flex min-h-16 items-center gap-1 border-t border-neutral-800 bg-neutral-900 px-2 pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:start-0 md:end-auto md:w-56 md:flex-col md:items-stretch md:gap-6 md:border-e md:border-t-0 md:p-4">
        <Link href="/" className="hidden items-center gap-3 rounded-lg p-2 md:flex">
          <Image src="/gym4me-logo.png" alt="" width={36} height={36} unoptimized />
          <span className="grid gap-0.5 font-semibold">
            {fa ? "جیم‌فورمی" : "Gym4Me"}
            <small className="text-xs font-normal text-theme-muted-foreground">
              {fa ? "پنل مدیریت" : "Admin panel"}
            </small>
          </span>
        </Link>
        <nav
          aria-label={fa ? "ناوبری اصلی" : "Main navigation"}
          className="flex min-w-0 flex-1 gap-1 md:flex-col"
        >
          {navigation.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={active ? "page" : undefined}
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-3 rounded-lg px-1 text-sm text-theme-muted-foreground transition-colors hover:bg-neutral-800 hover:text-theme-foreground aria-[current=page]:bg-neutral-800 aria-[current=page]:text-theme-foreground md:flex-none md:justify-start md:px-3"
            >
              <Icon size={20} />
              <span className="hidden truncate md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <Button
          iconOnly
          variant="text"
          color="neutral"
          aria-label={signOutLabel}
          title={signOutLabel}
          loading={signingOut}
          onClick={() => void signOut()}
        >
          <ArrowSignOut1 size={20} />
        </Button>
      </aside>
      {signOutError && (
        <p role="alert" className="fixed end-4 top-4 z-30 rounded-lg bg-neutral-800 p-3 text-white">
          {fa ? "خروج انجام نشد. دوباره تلاش کنید." : "Could not sign out. Try again."}
        </p>
      )}
      {(
        pathname === "/club" ||
        pathname === "/clubs" ||
        pathname === "/club/publications" ||
        resources
      ) ?
        <div id="panel-content" className={contentClass} tabIndex={-1}>
          <PanelBreadcrumb />
          {children}
        </div>
      : <PageTransition
          effect={pathname.startsWith("/club/") ? "slide" : "fade"}
          id="panel-content"
          className={contentClass}
          tabIndex={-1}
        >
          <PanelBreadcrumb />
          {children}
        </PageTransition>
      }
    </div>
  );
};
