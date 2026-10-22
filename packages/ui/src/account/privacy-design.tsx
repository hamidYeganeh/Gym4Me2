"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Database, ShieldCheck, Settings2, UserRoundCheck } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";

export function PrivacyDesignPage({
  backHref = "/profile/settings",
  children,
  footer,
}: {
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("Privacy");
  const design = useTranslations("PrivacyDesign");
  const features = [
    {
      icon: Database,
      title: design("dataTitle"),
      description: design("dataHint"),
    },
    {
      icon: ShieldCheck,
      title: design("sharingTitle"),
      description: design("sharingHint"),
    },
    {
      icon: Settings2,
      title: design("controlTitle"),
      description: design("controlHint"),
    },
  ];
  return (
    <main className="privacy-design mx-auto flex min-h-dvh max-w-xl flex-col gap-6 bg-background px-5 pt-[calc(1.5rem+var(--app-safe-top,0px))] pb-[calc(1.5rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header className="flex min-h-12 justify-end">
        <Button variant="outline" asChild>
          <Link href={backHref}>{t("back")}</Link>
        </Button>
      </header>
      <section
        className="flex flex-col items-center gap-4 pb-2 pt-2 text-center sm:pt-8"
        aria-labelledby="privacy-design-title"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRoundCheck className="size-6" aria-hidden="true" />
        </div>
        <h1
          id="privacy-design-title"
          className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
        >
          {t("title")}
        </h1>
        <p className="max-w-sm text-base leading-7 text-muted-foreground">
          {t("description")}
        </p>
      </section>
      <details className="privacy-principles">
        <summary>{design("controlTitle")}</summary>
        <ul className="flex flex-col gap-5 py-2">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-4">
              <Icon
                className="mt-1 size-6 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </details>
      {children}
      {footer && (
        <div className="mt-auto flex flex-col gap-4 pt-6">{footer}</div>
      )}
    </main>
  );
}
