"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "@repo/i18n";
import { useEffect, useRef, useState } from "react";
import { DownloadScene } from "./DownloadScene";
import { BarbellHorizontalIcon } from "@repo/ui/icons";
import type { LandingDownloadProps } from "./LandingDownload.types";
import styles from "./LandingDownload.module.css";

export function LandingDownload({
  id = "download",
  className,
  appStoreHref = process.env.NEXT_PUBLIC_APP_STORE_URL,
  googlePlayHref = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL,
  autoPlay = true,
}: LandingDownloadProps) {
  const growth = useTranslations("Growth");
  const webApp =
    process.env.NEXT_PUBLIC_APPLICATION_ORIGIN ||
    "https://gym4me-demo-application.vercel.app";
  const t = useTranslations("Website.download");
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  let character = 0;
  function letters(text: string) {
    return (locale === "fa" ? [text] : Array.from(text)).map(
      (letter, index) => (
        <span
          key={`${index}-${letter}`}
          style={{ animationDelay: `${0.035 * character++}s` }}
        >
          {letter === " " ? "\u00a0" : letter}
        </span>
      ),
    );
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      className={[styles.section, className].filter(Boolean).join(" ")}
      aria-label={t("label")}
      data-visible={visible}
    >
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.copy}>
          <h2 className={styles.title} aria-label={t("headline")}>
            {letters(t("line1"))}
            <br />
            {letters(t("line2") + " ")}
            <em>{letters(t("emphasis"))}</em>
          </h2>
          <p className={styles.description}>{t("description")}</p>
          <div className={styles.stores}>
            <a
              className={styles.store}
              href={appStoreHref || webApp}
              aria-label={appStoreHref ? t("appStoreLabel") : growth("openApp")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.storeIcon}>
                <Image
                  src="/download/apple.svg"
                  alt=""
                  width={20}
                  height={20}
                />
              </span>
              <span className={styles.storeText}>
                <span>{appStoreHref ? t("appStorePrefix") : "Gym4Me"}</span>
                <strong>
                  {appStoreHref ? t("appStore") : growth("openApp")}
                </strong>
              </span>
            </a>
            <a
              className={styles.store}
              href={googlePlayHref || webApp}
              aria-label={
                googlePlayHref ? t("googlePlayLabel") : growth("openApp")
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.storeIcon}>
                <Image
                  src="/download/google-play.svg"
                  alt=""
                  width={20}
                  height={20}
                />
              </span>
              <span className={styles.storeText}>
                <span>{googlePlayHref ? t("googlePlayPrefix") : "Gym4Me"}</span>
                <strong>
                  {googlePlayHref ? t("googlePlay") : growth("openApp")}
                </strong>
              </span>
            </a>
          </div>
          <div className={styles.proof}>
            <span className={styles.proofIcon} aria-hidden="true">
              <BarbellHorizontalIcon />
            </span>
            <div>
              <strong>{t("proofTitle")}</strong>
              <p className={styles.drinkers}>{t("proofDescription")}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.stageAnchor}>
        {visible && <DownloadScene autoPlay={autoPlay} />}
      </div>
    </section>
  );
}
