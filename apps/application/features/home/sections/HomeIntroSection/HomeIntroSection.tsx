"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/button";

export const HomeIntroSection = () => {
  const t = useTranslations("Application");

  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-3">
      <Image src="/gym4me-logo.png" alt="" width={48} height={48} unoptimized />
      <h1 id="home-title" className="text-theme-display font-semibold text-theme-primary">
        {t("gym4Me")}
      </h1>
      <p className="text-theme-body-large text-theme-muted-foreground">{t("yourTrainingApp")}</p>
      <nav aria-label={t("account")} className="mt-4 flex flex-wrap gap-3">
        <Button asChild radius="full" size="xl">
          <Link href="/auth/otp">{t("continueWithMobile")}</Link>
        </Button>
        <Link href="/my-requests/" lang="fa" dir="rtl" className="self-center underline">
          {t("myRequests")}
        </Link>
      </nav>
      <nav aria-label={t("profiles")} className="mt-4 flex flex-wrap gap-3">
        <Button asChild radius="full" size="xl">
          <Link href="/profile/athlete/">{t("athleteProfile")}</Link>
        </Button>
        <Button asChild variant="outlined" radius="full" size="xl">
          <Link href="/profile/coach/">{t("fitnessCoachProfile")}</Link>
        </Button>
      </nav>
      <Button asChild size="xl" radius="full" className="mt-4 w-fit">
        <Link href="/clubs/">{t("exploreClubs")}</Link>
      </Button>
    </section>
  );
};
