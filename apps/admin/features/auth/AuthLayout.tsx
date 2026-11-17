"use client";

import Image from "next/image";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import type { ReactNode } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { AnimatedButton } from "@repo/ui/kit/button";

import { PageTransition } from "../../lib/PageTransition";
import { authClasses } from "./auth-classes";
import { AuthCarousel } from "./AuthCarousel";

export const AuthLayout = (props: { children: ReactNode; panel: "admin" | "business" }) => {
  const { children, panel } = props;
  const t = useTranslations("Auth");
  const segment = useSelectedLayoutSegment();
  const back =
    segment === "set-password" ? "/auth/forgot-password"
    : segment === "forgot-password" ? "/auth/login"
    : "/auth";

  return (
    <main className={authClasses.shell} aria-label={t(panel)}>
      <div className={authClasses.panel}>
        <header className={authClasses.header}>
          {segment && (
            <AnimatedButton
              asChild
              variant="text"
              color="neutral"
              iconOnly
              radius="full"
              className={authClasses.back}
            >
              <Link href={back} aria-label={t("back")}>
                <ArrowLeft className="rtl:rotate-180" aria-hidden />
              </Link>
            </AnimatedButton>
          )}
          <Image src="/gym4me-logo.png" alt="" width={36} height={36} unoptimized />
        </header>
        <PageTransition effect="fade" className={authClasses.content}>
          {children}
        </PageTransition>
        <footer className={authClasses.footer}>Gym4Me</footer>
      </div>

      <AuthCarousel />
    </main>
  );
};
