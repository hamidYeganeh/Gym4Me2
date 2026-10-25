"use client";

import { PlayCircleIcon } from "@repo/ui/icons";
import { FitnessIllustration } from "@repo/ui/kit/FitnessIllustration";
import { useLocale, useTranslations } from "@repo/i18n";
import { useCallback, useMemo, useState } from "react";
import { getLandingClasses } from "./LandingClassesSection.data";
import { useClassCarousel } from "./useClassCarousel";
import { wrapOffset } from "./class-layout";
import { ClassPoster } from "./ClassPoster";
import { ClassesNavigation } from "./ClassesNavigation";
import { ClassPreviewDialog } from "./ClassPreviewDialog";
import type {
  ClassSelection,
  LandingClassesSectionProps,
} from "./LandingClassesSection.types";
import styles from "./LandingClassesSection.module.css";

export function LandingClassesSection({
  id = "classes",
  className,
  items: suppliedItems,
  initialIndex = 2,
  autoPlay = true,
  interval = 2000,
  showNavigation = true,
}: LandingClassesSectionProps) {
  const locale = useLocale();
  const t = useTranslations("Website.classes");
  const common = useTranslations("Website");
  const items = useMemo(
    () => suppliedItems ?? getLandingClasses(locale),
    [suppliedItems, locale],
  );
  const [selection, setSelection] = useState<ClassSelection | null>(null);
  const onSelect = useCallback(
    (next: ClassSelection) => setSelection(next),
    [],
  );
  const carousel = useClassCarousel({
    items,
    initialIndex,
    autoPlay,
    interval,
    onSelect,
  });
  const {
    sectionRef,
    copyRef,
    cards,
    layout,
    activeSlot,
    cardRefs,
    innerRefs,
    restore,
  } = carousel;
  const dismiss = useCallback(() => {
    setSelection(null);
  }, []);
  let character = 0;

  return (
    <section
      id={id}
      ref={sectionRef}
      aria-label={t("label")}
      className={[styles.section, className].filter(Boolean).join(" ")}
      data-active-class={cards[activeSlot]?.slug}
    >
      {showNavigation && <ClassesNavigation sectionId={id} />}
      {items.length ? (
        <>
          <div ref={copyRef} className={styles.heroCopy}>
            <div className={styles.eyebrow} data-hero-eyebrow>
              <span className={styles.sectionIcon} aria-hidden="true">
                <PlayCircleIcon />
              </span>
              <span>{t("browsing")}</span>
              <span className={styles.slash}>/</span>
              <strong>{cards[activeSlot]?.title}</strong>
            </div>
            <h2 className={styles.title} aria-label={t("headline")}>
              {[t("headline1"), t("headline2")].map((line, row) => (
                <span key={row} className={styles.titleLine}>
                  {(locale === "fa" ? [line] : Array.from(line)).map(
                    (letter, index) => (
                      <span
                        data-title-letter
                        key={`${row}-${index}`}
                        style={{ animationDelay: `${character++ * 0.035}s` }}
                      >
                        {letter === " " ? "\u00a0" : letter}
                      </span>
                    ),
                  )}
                </span>
              ))}
            </h2>
          </div>
          <div
            className={styles.carousel}
            role="group"
            aria-roledescription={common("carousel")}
            aria-label={t("instructions")}
            tabIndex={0}
            onPointerDown={carousel.pointerDown}
            onPointerMove={carousel.pointerMove}
            onPointerUp={carousel.pointerUp}
            onPointerCancel={carousel.pointerUp}
            onMouseEnter={() => carousel.setHovered(true)}
            onMouseLeave={() => carousel.setHovered(false)}
            onFocusCapture={() => carousel.setFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                carousel.setFocused(false);
            }}
            onKeyDown={carousel.keyDown}
          >
            <div className={styles.fan} style={{ top: layout.centerY }}>
              {cards.map((item, slot) => {
                const accessible =
                  Math.abs(wrapOffset(slot - activeSlot, cards.length)) <=
                  Math.floor((items.length - 1) / 2);
                return (
                  <div
                    key={`${item.id}-${slot}`}
                    className={styles.card}
                    aria-hidden={!accessible}
                    ref={(element) => {
                      cardRefs.current[slot] = element;
                    }}
                    style={{
                      width: layout.cardW,
                      height: layout.cardH,
                      marginLeft: -layout.cardW / 2,
                      marginTop: -layout.cardH / 2,
                      transformOrigin: `50% ${layout.origin}%`,
                    }}
                  >
                    <div
                      className={styles.cardInner}
                      ref={(element) => {
                        innerRefs.current[slot] = element;
                      }}
                    >
                      <ClassPoster item={item} />
                      <button
                        type="button"
                        className={styles.cardTrigger}
                        onClick={() => carousel.select(slot)}
                        tabIndex={accessible ? 0 : -1}
                        aria-hidden={!accessible}
                        aria-label={t("open", { title: item.title })}
                        aria-haspopup="dialog"
                        aria-current={slot === activeSlot ? "true" : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              data-playback
              type="button"
              className={styles.playback}
              aria-label={t(carousel.paused ? "play" : "pause")}
              aria-pressed={carousel.paused}
              onClick={carousel.togglePause}
            >
              {common(carousel.paused ? "play" : "pause")}
            </button>
            <span
              className="sr-only"
              aria-live={carousel.paused ? "polite" : "off"}
            >
              {cards[activeSlot]?.title}
            </span>
          </div>
          {selection && (
            <ClassPreviewDialog
              selection={selection}
              reducedMotion={carousel.reducedMotion}
              onDismiss={dismiss}
              onRestore={() => restore(selection.slot)}
            />
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <FitnessIllustration kind="kettlebell" />
          <p>{t("empty")}</p>
        </div>
      )}
    </section>
  );
}
