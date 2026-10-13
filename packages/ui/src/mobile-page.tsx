"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "@repo/i18n";
import { ChevronLeft } from "lucide-react";
import { Button } from "./kit/Button";
import { cn } from "./lib/utils";

export function MobileHeader({
  title,
  backHref = "/discovery",
  subtitle,
  actions,
  className,
}: {
  title: string;
  backHref?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("Privacy");
  return (
    <header className={cn("flex min-h-11 items-center gap-3", className)}>
      <Button asChild variant="outline" size="icon-lg" className="size-11">
        <Link href={backHref} scroll={false} aria-label={t("back")}>
          <ChevronLeft className="rtl:rotate-180" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold leading-8">{title}</h1>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions}
    </header>
  );
}
export function MobilePage({
  children,
  title,
  backHref,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  backHref?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <main className="mobile-page mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 bg-background px-5 pt-[calc(1.5rem+var(--app-safe-top,0px))] pb-[calc(2rem+var(--app-safe-bottom,0px))] sm:px-6">
      <MobileHeader
        title={title}
        backHref={backHref}
        subtitle={subtitle}
        actions={actions}
      />
      <div className="grid gap-6">{children}</div>
    </main>
  );
}
