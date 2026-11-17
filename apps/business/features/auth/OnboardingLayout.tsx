"use client";

import Image from "next/image";
import Link from "next/link";

import type { ReactNode } from "react";

import { useTranslations } from "@repo/i18n";

import weights from "./artwork/free-weights.webp";
import floor from "./artwork/gym-floor.webp";
import training from "./artwork/strength-training.webp";
import { onboardingClasses } from "./onboarding-classes";

const imageClasses = [onboardingClasses.image0, onboardingClasses.image1, onboardingClasses.image2];

export const OnboardingLayout = (props: { children: ReactNode }) => {
  const { children } = props;
  const t = useTranslations("Onboarding");
  return (
    <main className={onboardingClasses.shell}>
      <section className={onboardingClasses.panel}>
        <header>
          <Link href="/auth" aria-label={t("signIn")}>
            <Image src="/gym4me-logo.png" width={36} height={36} alt="Gym4Me" />
          </Link>
        </header>
        <div className={onboardingClasses.content}>{children}</div>
        <footer>Gym4Me</footer>
      </section>
      <aside className={onboardingClasses.art} aria-hidden="true">
        <div className={onboardingClasses.collage}>
          {[floor, training, weights].map((asset, index) => (
            <div key={asset.src} className={imageClasses[index]}>
              <Image src={asset} alt="" fill sizes="(min-width: 768px) 26vw, 1px" />
            </div>
          ))}
        </div>
        <p>{t("artCaption")}</p>
      </aside>
    </main>
  );
};
