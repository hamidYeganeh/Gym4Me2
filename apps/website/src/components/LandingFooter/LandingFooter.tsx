"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "@repo/i18n";
import styles from "./LandingFooter.module.css";

export function LandingFooter({
  onVisibilityChange,
}: {
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const t = useTranslations("Website.footer");
  const nav = useTranslations("Website.nav");
  const brand = useTranslations("Metadata");
  const runway = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState({ height: 0, fixed: false });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = sheet.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(element.getBoundingClientRect().height);
        const fixed = height <= window.innerHeight + 1;
        setLayout((previous) =>
          previous.height === height && previous.fixed === fixed
            ? previous
            : { height, fixed },
        );
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const element = runway.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = Boolean(entry?.isIntersecting);
        setVisible(next);
        onVisibilityChange?.(next);
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  return (
    <div
      ref={runway}
      id="footer"
      className={styles.runway}
      data-fixed={layout.fixed}
      data-visible={visible}
      data-ready={layout.height > 0}
      style={{ "--footer-height": `${layout.height}px` } as CSSProperties}
      onFocusCapture={() => {
        if (
          layout.fixed &&
          runway.current &&
          runway.current.getBoundingClientRect().bottom > window.innerHeight + 1
        )
          runway.current.scrollIntoView({ block: "end", behavior: "instant" });
      }}
    >
      <footer ref={sheet} className={styles.sheet} aria-label={t("label")}>
        <div className={styles.card}>
          <div className={styles.top}>
            <div className={styles.column}>
              <span className={styles.pill}>{t("start")}</span>
              <h2>{t("headline")}</h2>
              <a className={styles.textLink} href="#clubs">
                {t("explore")} <span aria-hidden="true">↗</span>
              </a>
            </div>
            <nav className={styles.column} aria-label={t("browse")}>
              <span className={styles.pill}>{t("browse")}</span>
              {(["clubs", "locations", "classes"] as const).map((id) => (
                <a key={id} className={styles.navLink} href={`#${id}`}>
                  {nav(id)}
                </a>
              ))}
            </nav>
            <div className={styles.column}>
              <span className={styles.pill}>{t("together")}</span>
              <p>{t("note")}</p>
              <a className={styles.textLink} href="#download">
                {t("download")} <span aria-hidden="true">↗</span>
              </a>
              <span className={styles.subtext}>{t("tagline")}</span>
            </div>
          </div>

          <div className={styles.collage} aria-hidden="true" dir="ltr">
            <div className={styles.wordmark}>
              {Array.from(brand("brand")).map((letter, index) => (
                <span
                  key={`${index}-${letter}`}
                  style={{ "--letter": index } as CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </div>
            <div className={`${styles.sticker} ${styles.bam}`}>
              <span>{t("bam")}</span>
            </div>
            <div className={`${styles.sticker} ${styles.smiley}`}>
              <span />
            </div>
            <div className={`${styles.sticker} ${styles.heart}`}>
              <svg viewBox="0 0 100 100" fill="none">
                <path
                  className={styles.heartShape}
                  d="M50 89 20 60C-5 32 27 9 50 31 73 9 105 32 80 60Z"
                />
                <path
                  className={styles.sparkle}
                  d="m18 6 4 12 12 4-12 4-4 12-4-12L2 22l12-4ZM84 2l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"
                />
              </svg>
            </div>
            <div className={`${styles.sticker} ${styles.hands}`}>
              <span />
            </div>
            <div className={`${styles.sticker} ${styles.hundred}`}>
              {t("hundred")}
            </div>
            <div className={`${styles.sticker} ${styles.camera}`}>
              <span className={styles.lens} />
              <span className={styles.flash} />
            </div>
          </div>

          <div className={styles.bottom}>
            <span>{t("signature")}</span>
            <a className={styles.credits} href="#main-content">
              {t("backToTop")} <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
