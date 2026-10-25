"use client";

import Image from "next/image";
import {
  CompassIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MapPin1Icon,
  PlayIcon,
  PauseIcon,
} from "@repo/ui/icons";
import { useLocale, useTranslations, useFormatter } from "@repo/i18n";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import { useMemo } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { getLandingClubs } from "./LandingClubsSection.data";
import type { LandingClubsSectionProps } from "./LandingClubsSection.types";
import styles from "./LandingClubsSection.module.css";

interface CarouselState {
  active: number;
  order: number[];
}

interface SlideTransition {
  next: CarouselState;
  origin: { left: number; top: number; width: number; height: number } | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function LandingClubsSection({
  items: suppliedItems,
  autoPlay = true,
  interval = 5250,
  className,
}: LandingClubsSectionProps) {
  const locale = useLocale();
  const t = useTranslations("Website.clubs");
  const common = useTranslations("Website");
  const labels = useTranslations("Clubs");
  const format = useFormatter();
  const rtl = locale === "fa";
  const items = useMemo(
    () => suppliedItems ?? getLandingClubs(locale),
    [suppliedItems, locale],
  );
  const [carousel, setCarousel] = useState<CarouselState>(() => ({
    active: 0,
    order: items.map((_, index) => index).slice(1),
  }));
  const [transition, setTransition] = useState<SlideTransition | null>(null);
  const [visibleCards, setVisibleCards] = useState(2);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef(new Map<number, HTMLDivElement>());
  const busyRef = useRef(false);
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const current = items[carousel.active] ?? items[0];
  const incoming = transition ? items[transition.next.active] : undefined;

  // The preview rail always contains two shared cards, with responsive widths.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = entry.contentRect.width;
      const cardWidth =
        width <= 900 ? (width - 64) / 2 : clamp(width * 0.205, 200, 300);
      section.style.setProperty("--card-width", `${cardWidth}px`);
      setVisibleCards(Math.min(2, Math.max(0, items.length - 1)));
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [items.length]);

  // Warm the next full-size photos without blocking the initial hero image.
  useEffect(() => {
    const nextImages = carousel.order.slice(0, 3).map((index) => {
      const image = new window.Image();
      image.src = items[index]?.image ?? "";
      return image;
    });
    return () => {
      nextImages.forEach((image) => {
        image.src = "";
      });
    };
  }, [carousel.order, items]);

  const selectSlide = useCallback(
    (index: number | undefined, reverse = false) => {
      if (
        index === undefined ||
        !items[index] ||
        index === carousel.active ||
        busyRef.current
      )
        return;
      const next: CarouselState = {
        active: index,
        order: reverse
          ? [
              carousel.active,
              ...carousel.order.filter((item) => item !== index),
            ]
          : [
              ...carousel.order.filter((item) => item !== index),
              carousel.active,
            ],
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCarousel(next);
        return;
      }

      const section = sectionRef.current?.getBoundingClientRect();
      const card = reverse
        ? undefined
        : cardsRef.current.get(index)?.getBoundingClientRect();
      const origin =
        section &&
        card &&
        card.right > section.left &&
        card.left < section.right &&
        card.width > 0
          ? {
              left: card.left - section.left,
              top: card.top - section.top,
              width: card.width,
              height: card.height,
            }
          : null;
      busyRef.current = true;
      setTransition({ next, origin });
    },
    [carousel, items],
  );

  // A selected preview grows into the backdrop; copy fades out and back in halfway.
  useEffect(() => {
    if (!transition || !tileRef.current) return;
    const tile = tileRef.current;
    const animations: Animation[] = [];
    const { origin } = transition;
    animations.push(
      tile.animate(
        [
          origin
            ? {
                left: `${origin.left}px`,
                top: `${origin.top}px`,
                width: `${origin.width}px`,
                height: `${origin.height}px`,
                borderRadius: "20px",
                opacity: 1,
              }
            : {
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                borderRadius: 0,
                opacity: 0,
              },
          {
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            borderRadius: 0,
            opacity: 1,
          },
        ],
        {
          duration: 1250,
          easing: "cubic-bezier(0.76, 0, 0.24, 1)",
          fill: "forwards",
        },
      ),
    );

    if (copyRef.current)
      animations.push(
        copyRef.current.animate(
          [
            {
              opacity: 1,
              filter: "blur(0px)",
              transform: "translateY(var(--copy-offset, -50%))",
            },
            {
              opacity: 0,
              filter: "blur(8px)",
              transform: "translateY(calc(var(--copy-offset, -50%) - 16px))",
            },
          ],
          { duration: 625, fill: "forwards" },
        ),
      );

    const midpoint = window.setTimeout(() => {
      setCarousel(transition.next);
      if (copyRef.current)
        animations.push(
          copyRef.current.animate(
            [
              {
                opacity: 0,
                filter: "blur(8px)",
                transform: "translateY(calc(var(--copy-offset, -50%) + 16px))",
              },
              {
                opacity: 1,
                filter: "blur(0px)",
                transform: "translateY(var(--copy-offset, -50%))",
              },
            ],
            { duration: 625, fill: "forwards" },
          ),
        );
    }, 625);
    const finish = window.setTimeout(() => {
      setTransition(null);
      busyRef.current = false;
    }, 1250);

    return () => {
      window.clearTimeout(midpoint);
      window.clearTimeout(finish);
      animations.forEach((animation) => animation.cancel());
      busyRef.current = false;
    };
  }, [transition]);

  useEffect(() => {
    if (
      !autoPlay ||
      paused ||
      hovered ||
      focused ||
      transition ||
      items.length < 2
    )
      return;
    const timer = window.setInterval(
      () => {
        if (
          !document.hidden &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          selectSlide(carousel.order[0]);
        }
      },
      Math.max(4000, interval),
    );
    return () => window.clearInterval(timer);
  }, [
    autoPlay,
    paused,
    hovered,
    focused,
    transition,
    items.length,
    interval,
    selectSlide,
    carousel.order,
  ]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest("a, button")
    )
      return;
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (!pointer || pointer.id !== event.pointerId) return;
    const distance = event.clientX - pointer.x;
    if (
      Math.abs(distance) > 66 &&
      Math.abs(distance) > Math.abs(event.clientY - pointer.y)
    ) {
      selectSlide(
        distance < 0 !== rtl ? carousel.order[0] : carousel.order.at(-1),
        distance > 0 !== rtl,
      );
    }
  }

  if (!current) return null;

  return (
    <section
      ref={sectionRef}
      className={[styles.section, className].filter(Boolean).join(" ")}
      style={{ "--visible-cards": visibleCards } as CSSProperties}
      id="clubs"
      dir={rtl ? "rtl" : "ltr"}
      aria-label={t("label")}
      aria-roledescription={common("carousel")}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        selectSlide(
          (event.key === "ArrowRight") !== rtl
            ? carousel.order[0]
            : carousel.order.at(-1),
          (event.key === "ArrowLeft") !== rtl,
        );
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointerRef.current = null;
      }}
    >
      <div className={styles.background}>
        <Image
          src={current.image}
          alt={`${current.title} — ${current.region}`}
          fill
          sizes="100vw"
          preload
          unoptimized
          draggable={false}
        />
      </div>
      {incoming && (
        <div ref={tileRef} className={styles.tile} aria-hidden="true">
          <Image
            src={incoming.image}
            alt=""
            fill
            sizes="100vw"
            unoptimized
            draggable={false}
          />
        </div>
      )}
      <div className={styles.scrim} />

      <div ref={copyRef} className={styles.copy}>
        <span className={styles.sectionIcon} aria-hidden="true">
          <CompassIcon />
        </span>
        <div className={styles.region}>{current.region}</div>
        <h2 className={styles.title} aria-label={current.titleLines.join(" ")}>
          {current.titleLines.map((line, index) => (
            <span key={`${index}-${line}`}>{line}</span>
          ))}
        </h2>
        <p className={styles.description}>{current.description}</p>
        <a className={styles.discover} href={current.href}>
          <span className={styles.discoverIcon}>
            <ArrowRightIcon aria-hidden="true" />
          </span>
          <span>{common("nav.classes")}</span>
        </a>
        <p className={styles.coordinates}>
          <MapPin1Icon aria-hidden="true" />
          {current.coordinates}
        </p>
      </div>

      {items.length > 1 && (
        <div className={styles.controls}>
          <div className={styles.arrows}>
            <button
              type="button"
              aria-label={t("previous")}
              className={styles.arrow}
              onClick={() => selectSlide(carousel.order.at(-1), true)}
            >
              <ArrowLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t("next")}
              className={styles.arrow}
              onClick={() => selectSlide(carousel.order[0])}
            >
              <ArrowRightIcon aria-hidden="true" />
            </button>
          </div>
          <div className={styles.progress} aria-hidden="true">
            <span
              style={{
                width: `${((carousel.active + 1) / items.length) * 100}%`,
              }}
            />
          </div>
          <button
            type="button"
            className={styles.counter}
            onClick={() => setPaused((value) => !value)}
            aria-label={t(paused ? "play" : "pause")}
            aria-pressed={paused}
            title={t(paused ? "play" : "pause")}
          >
            <span className={styles.playbackIcon} aria-hidden="true">
              {paused ? <PlayIcon /> : <PauseIcon />}
            </span>
            <span className={styles.digits} key={carousel.active}>
              {format.number(carousel.active + 1, { minimumIntegerDigits: 2 })}
            </span>
            <span className={styles.total}>
              / {format.number(items.length, { minimumIntegerDigits: 2 })}
            </span>
          </button>
          <span
            className="sr-only"
            aria-live={paused || focused ? "polite" : "off"}
            aria-atomic="true"
          >
            {t("slide", {
              current: carousel.active + 1,
              total: items.length,
              title: current.title,
            })}
          </span>
        </div>
      )}

      <div className={styles.rail} aria-label={t("upcoming")}>
        {items.map((item, index) => {
          const slot = carousel.order.indexOf(index);
          const visible =
            slot >= 0 &&
            slot < visibleCards &&
            transition?.next.active !== index;
          return (
            <div
              key={item.id}
              ref={(element) => {
                if (element) cardsRef.current.set(index, element);
                else cardsRef.current.delete(index);
              }}
              className={styles.card}
              style={{ "--slot": slot } as CSSProperties}
              aria-hidden={!visible}
              inert={!visible}
              onClickCapture={(event) => {
                if (!(event.target as Element).closest("a")) return;
                event.preventDefault();
                sectionRef.current?.focus({ preventScroll: true });
                selectSlide(index);
              }}
            >
              <ClubCard
                club={item.club}
                labels={{
                  save: labels("save"),
                  unsave: labels("unsave"),
                  discover: t("preview"),
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
