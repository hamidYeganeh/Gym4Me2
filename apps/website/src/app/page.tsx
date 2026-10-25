"use client";

import { useTranslations } from "@repo/i18n";
import { useState } from "react";
import { LiveCatalog } from "@/components/LiveCatalog";
import { LandingNavigation } from "@/components/LandingNavigation";
import { LandingDownload } from "@/components/LandingDownload";
import { LandingLocationsSection } from "@/components/LandingLocationsSection";
import { LandingFooter } from "@/components/LandingFooter";
import styles from "./page.module.css";

export default function Home() {
  const t = useTranslations("Website");
  const [footerVisible, setFooterVisible] = useState(false);
  return (
    <>
      <div className={styles.content}>
        <LandingNavigation footerVisible={footerVisible} />
        <main id="main-content">
          <h1 className="sr-only">{t("title")}</h1>
          <LiveCatalog />
          <LandingLocationsSection />
          <LandingDownload />
        </main>
      </div>
      <LandingFooter onVisibilityChange={setFooterVisible} />
    </>
  );
}
