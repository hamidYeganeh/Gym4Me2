"use client";

import Link from "next/link";

import { useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";

import { authClasses } from "./auth-classes";
import { AuthHeading } from "./AuthHeading";

export const AuthMethods = ({ applicationUrl }: { applicationUrl?: string }) => {
  const t = useTranslations("Auth");

  return (
    <>
      <AuthHeading title={t("methods.title")} description={t("methods.description")} />
      <nav aria-label={t("methods.title")} className={authClasses.fields}>
        <AnimatedButton asChild color="primary" size="xl" radius="full" fullWidth>
          <Link href="/auth/login">{t("methods.password")}</Link>
        </AnimatedButton>
        <AnimatedButton
          asChild
          variant="outlined"
          color="neutral"
          size="xl"
          radius="full"
          fullWidth
        >
          <Link href="/auth/otp">{t("methods.otp")}</Link>
        </AnimatedButton>
        {applicationUrl && (
          <AnimatedButton asChild variant="text" color="neutral" radius="full">
            <Link href={applicationUrl}>{t("requestClub")}</Link>
          </AnimatedButton>
        )}
      </nav>
    </>
  );
};
