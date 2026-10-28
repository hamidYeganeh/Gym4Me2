"use client";

import { useTranslations } from "@repo/i18n";
import { LandingDownload } from "@/components/LandingDownload";
import styles from "./page.module.css";

export default function Home() {
  const t = useTranslations("Website");
  return (
    <div className={styles.content}>
      <main id="main-content">
        <h1 className="sr-only">{t("title")}</h1>
        <LandingDownload />
      </main>
    </div>
  );
}
