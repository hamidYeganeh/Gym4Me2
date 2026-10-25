"use client";

import { useTranslations } from "@repo/i18n";
import { Logo } from "@repo/theme/logo";
import { useState } from "react";
import Image from "next/image";
import styles from "./LandingClassesSection.module.css";

const source = "https://stream-showcase-template.modulify.website/";
const links = [
  { label: "library", hash: "library" },
  { label: "how", hash: "how" },
  { label: "stories", hash: "stories" },
] as const;

export function ClassesNavigation({ sectionId }: { sectionId: string }) {
  const t = useTranslations("Website.classes");
  const nav = useTranslations("Website.nav");
  const [open, setOpen] = useState(false);
  return (
    <header
      className={styles.header}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <nav className={styles.nav} aria-label={t("brand")}>
        <a className={styles.brand} href={`#${sectionId}`}>
          <span>
            <Logo size={22} />
          </span>
          {t("brand")}
        </a>
        <ul className={styles.navLinks}>
          {links.map((link) => (
            <li key={link.hash}>
              <a href={`${source}#${link.hash}`}>{t(link.label)}</a>
            </li>
          ))}
        </ul>
        <div className={styles.navActions}>
          <a href={`${source}#waitlist`}>{t("signin")}</a>
          <a className={styles.startWatching} href={`${source}#waitlist`}>
            {t("start")}
          </a>
        </div>
        <button
          className={styles.menuToggle}
          type="button"
          aria-expanded={open}
          aria-controls={`${sectionId}-menu`}
          aria-label={nav(open ? "close" : "open")}
          onClick={() => setOpen(!open)}
        >
          <Image
            src={`/classes/${open ? "close" : "menu"}.svg`}
            alt=""
            width={20}
            height={20}
          />
        </button>
      </nav>
      {open && (
        <div className={styles.mobileMenu} id={`${sectionId}-menu`}>
          <ul>
            {links.map((link) => (
              <li key={link.hash}>
                <a
                  onClick={() => setOpen(false)}
                  href={`${source}#${link.hash}`}
                >
                  {t(link.label)}
                </a>
              </li>
            ))}
            <li>
              <a
                className={styles.mobileStart}
                href={`${source}#waitlist`}
                onClick={() => setOpen(false)}
              >
                {t("start")}
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
