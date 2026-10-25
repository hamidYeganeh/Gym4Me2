"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CompassIcon,
  PlayCircleIcon,
  ArrowDownIcon,
  MapPin1Icon,
} from "@repo/ui/icons";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { Logo } from "@repo/theme/logo";
import { Button } from "@repo/ui/kit/Button";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import styles from "./LandingNavigation.module.css";

const sections = [
  { id: "clubs", Icon: CompassIcon },
  { id: "locations", Icon: MapPin1Icon },
  { id: "classes", Icon: PlayCircleIcon },
  { id: "download", Icon: ArrowDownIcon },
] as const;

export function LandingNavigation({
  footerVisible = false,
}: {
  footerVisible?: boolean;
}) {
  const [active, setActive] = useState<string>("clubs");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActive(current.target.id);
      },
      { rootMargin: "-15% 0px -45% 0px", threshold: [0, 0.1, 0.3, 0.6] },
    );
    for (const { id } of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  const t = useTranslations("Website.nav");
  const brand = useTranslations("Metadata");
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  return (
    <header
      className={styles.header}
      data-footer-visible={footerVisible}
      inert={footerVisible}
      aria-hidden={footerVisible || undefined}
    >
      <nav aria-label={t("primary")} className={styles.nav}>
        <Link href="/" aria-label={brand("brand")} className={styles.brand}>
          <Logo size={30} className={styles.logo} />
          <span>{brand("brand")}</span>
        </Link>
        <ul className={styles.links}>
          {sections.map(({ id, Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                onClick={() => setActive(id)}
              >
                <Icon aria-hidden="true" />
                <span>{t(id)}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("language")}
            onClick={() => void changeLocale(locale === "fa" ? "en" : "fa")}
          >
            <span lang={locale === "fa" ? "en" : "fa"}>
              {t(locale === "fa" ? "english" : "persian")}
            </span>
          </Button>
          <AnimatedThemeToggler label={t("theme")} size="icon" />
        </div>
      </nav>
    </header>
  );
}
