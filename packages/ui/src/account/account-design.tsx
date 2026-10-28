"use client";

import { useTranslations } from "@repo/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Calendar1Icon as CalendarDays,
  ChevronLeftIcon as ChevronLeft,
  CompassIcon as Compass,
  CreditCardIcon as CreditCard,
  House1Icon as Home,
  UserIcon as UserRound,
} from "../icons";
import { Avatar, AvatarFallback } from "../kit/Avatar";
import { Button } from "../kit/Button";
import { cn } from "../lib/utils";
import "./account-design.css";

export function AccountAvatar({
  name,
  large = false,
}: {
  name?: string | null;
  large?: boolean;
}) {
  return (
    <Avatar className={cn("size-12", large && "size-28 sm:size-32")}>
      <AvatarFallback>
        {name?.trim().slice(0, 2).toLocaleUpperCase() || (
          <UserRound className={cn("size-6", large && "size-12")} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export function AccountNavigation() {
  const t = useTranslations("SimpleApp");
  const path = usePathname();
  const items = [
    { href: "/", label: "home", Icon: Home },
    { href: "/discovery", label: "gyms", Icon: Compass },
    { href: "/bookings", label: "bookings", Icon: CalendarDays },
    { href: "/memberships", label: "memberships", Icon: CreditCard },
  ] as const;
  return (
    <nav
      aria-label={t("more")}
      className="profile-navigation fixed inset-x-5 bottom-[calc(1rem+var(--app-safe-bottom,0px))] mx-auto flex max-w-[calc(36rem-2.5rem)] items-center gap-1 rounded-full border border-border bg-card/95 p-2 shadow-lg backdrop-blur-xl"
    >
      {items.map(({ href, label, Icon }) => (
        <Button
          key={href}
          variant={path === href ? "secondary" : "ghost"}
          asChild
          className="h-14 flex-1 min-w-0 px-1"
        >
          <Link
            href={href}
            aria-current={path === href ? "page" : undefined}
            className="flex flex-col gap-1"
          >
            <Icon />
            <span className="text-xs">{t(label)}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function AccountDesignPage({
  title,
  backHref = "/profile",
  actions,
  children,
}: {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("Privacy");
  return (
    <main className="account-design min-h-dvh bg-muted/50 px-5 pb-[calc(8rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header className="account-design-header sticky top-0 flex items-center justify-between gap-3 py-5 pt-[calc(1.5rem+var(--app-safe-top,0px))]">
        <Button asChild variant="outline" size="icon-lg" className="size-12">
          <Link href={backHref} aria-label={t("back")}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-center text-lg font-semibold">{title}</h1>
        <div className="flex size-12 items-center justify-center">
          {actions}
        </div>
      </header>
      <div className="account-design-content flex flex-col gap-6 pb-6">
        {children}
      </div>
      <AccountNavigation />
    </main>
  );
}
