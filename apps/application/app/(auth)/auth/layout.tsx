"use client";

import Link from "next/link";

import type { ReactNode } from "react";

import styles from "@/features/auth/auth-screen.module.css";
import { ResetPhoneProvider } from "@/features/auth/ResetPhoneProvider";
import { ApiProvider } from "@repo/api/react-query";
import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { buttonVariants } from "@repo/ui/kit/button";

const AuthLayout = (props: { children: ReactNode }) => {
  const { children } = props;
  const t = useTranslations("Application");
  return (
    <main className={styles.shell} data-theme="dark">
      <div className={styles.content}>
        <nav aria-label={t("authNavigation")} className="flex items-center justify-between">
          <Link
            href="/"
            aria-label={t("backToGym4Me")}
            className={buttonVariants({
              iconOnly: true,
              variant: "text",
              color: "neutral",
              radius: "full",
              size: "lg",
              className: "size-theme-10",
            })}
          >
            <ArrowLeft data-icon="inline-start" />
          </Link>
          <Link
            href="/clubs/"
            className={buttonVariants({ variant: "text", color: "neutral", radius: "full" })}
          >
            {t("skip")}
          </Link>
        </nav>
        <ApiProvider>
          <ResetPhoneProvider>{children}</ResetPhoneProvider>
        </ApiProvider>
      </div>
    </main>
  );
};

export default AuthLayout;
