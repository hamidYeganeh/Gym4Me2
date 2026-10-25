"use client";

import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { useLocale } from "@repo/i18n";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getClassLayout, wrapOffset } from "./class-layout";
import type {
  ClassSelection,
  LandingClass,
} from "./LandingClassesSection.types";

gsap.registerPlugin(useGSAP);

export function useClassCarousel({
  items,
  initialIndex,
  autoPlay,
  interval,
  onSelect,
}: {
  items: readonly LandingClass[];
  initialIndex: number;
  autoPlay: boolean;
  interval: number;
  onSelect: (selection: ClassSelection) => void;
}) {
  const direction = useLocale() === "fa" ? -1 : 1;
  const cards = useMemo(
    () => (items.length > 1 ? [...items, ...items] : [...items]),
    [items],
  );
  const count = cards.length;
  const initial = count
    ? ((initialIndex % items.length) + items.length) % items.length
    : 0;
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layoutRef = useRef(getClassLayout(800, 1280));
  const [layout, setLayout] = useState(() => getClassLayout(800, 1280));
  const [activeSlot, setActiveSlot] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const paintRef = useRef<() => void>(() => {});
  const entranceRef = useRef<gsap.core.Timeline | null>(null);
  const blockedClick = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const drag = useRef<{
    id: number;
    startX: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const catalogKey = `${items.map((item) => item.id).join("|")}:${initial}`;
  const control = useRef({
    catalogKey,
    angle: initial,
    active: initial,
    open: false,
    pending: false,
    entered: false,
    visible: false,
    intro: false,
    hover: false,
    focus: false,
    paused: false,
    reduced: false,
    afterClose: false,
    idle: 0,
  });

  const { contextSafe } = useGSAP(
    (context, safe) => {
      const section = sectionRef.current;
      if (!section || !count) return;
      const state = control.current;
      if (state.catalogKey !== catalogKey) {
        state.angle = initial;
        state.catalogKey = catalogKey;
      }
      state.idle = performance.now();
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onMotion = () => {
        state.reduced = media.matches;
        setReducedMotion(media.matches);
        if (state.reduced) {
          tweenRef.current?.kill();
          state.angle = Math.round(state.angle);
          entranceRef.current?.progress(1);
        }
      };
      onMotion();
      media.addEventListener("change", onMotion);
      const resize = () => {
        layoutRef.current = getClassLayout(
          section.clientHeight,
          section.clientWidth,
        );
        setLayout(layoutRef.current);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(section);
      resize();
      const enter = safe!(() => {
        if (state.entered) return;
        state.entered = true;
        if (state.reduced) return;
        state.intro = true;
        const letters = section.querySelectorAll("[data-title-letter]");
        const eyebrow = section.querySelector("[data-hero-eyebrow]");
        const nodes = cardRefs.current.filter(Boolean);
        const timeline = gsap.timeline({
          delay: 0.1,
          onComplete: () => {
            state.intro = false;
            state.idle = performance.now();
          },
        });
        entranceRef.current = timeline;
        timeline.fromTo(
          letters,
          {
            y: 80,
            opacity: 0,
            scale: 0.4,
            rotation: (index: number) => ((index * 17) % 44) - 22,
            filter: "blur(14px)",
            transformOrigin: "50% 100%",
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
            filter: "blur(0px)",
            duration: 0.75,
            ease: "back.out(1.7)",
            stagger: 0.035,
          },
          0,
        );
        nodes.forEach((node, index) => {
          const offset = wrapOffset(index - state.angle, count);
          timeline.fromTo(
            node,
            { y: 260, opacity: 0, scale: 0.55, rotation: 0 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              rotation: offset * layoutRef.current.angle * direction,
              duration: 0.9,
              ease: "back.out(1.25)",
            },
            0.45 + 0.09 * Math.abs(offset),
          );
        });
        if (eyebrow)
          timeline.fromTo(
            eyebrow,
            { opacity: 0, y: 24, filter: "blur(8px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.75,
              ease: "power3.out",
            },
            0.7,
          );
      });
      const intersection = new IntersectionObserver(([entry]) => {
        state.visible = entry?.isIntersecting ?? false;
        if (state.visible) {
          state.idle = performance.now();
          enter();
        }
      });
      intersection.observe(section);

      function paint() {
        const slot = ((Math.round(state.angle) % count) + count) % count;
        if (slot !== state.active) {
          state.active = slot;
          setActiveSlot(slot);
        }
        cardRefs.current.forEach((card, index) => {
          if (!card) return;
          const offset = wrapOffset(index - state.angle, count);
          const distance = Math.abs(offset);
          const opacity =
            distance > count / 2 - 0.5
              ? Math.max(0, 1 - (distance - (count / 2 - 0.5)) / 0.5)
              : 1;
          card.style.transform = `rotate(${offset * layoutRef.current.angle * direction}deg)`;
          card.style.zIndex = String(Math.round(30 - distance * 2));
          card.style.opacity = String(opacity);
          card.style.pointerEvents = opacity > 0 ? "auto" : "none";
          card.style.filter = `grayscale(${Math.min(1, distance) * 100}%)`;
          const inner = innerRefs.current[index];
          if (inner)
            inner.style.transform = `scale(${1 - 0.15 * Math.min(distance, 1)})`;
          const image = card.querySelector<HTMLElement>("[data-cover]");
          if (image)
            image.style.opacity = String(0.5 + 0.5 * Math.max(0, 1 - distance));
          const active = distance < 0.4;
          for (const selector of [
            "[data-card-meta]",
            "[data-card-overlay]",
            "[data-card-gradient]",
          ]) {
            const element = card.querySelector<HTMLElement>(selector);
            if (element) {
              element.style.opacity = active ? "1" : "0";
              if (selector === "[data-card-meta]")
                element.style.transform = active
                  ? "translateY(0)"
                  : "translateY(8px)";
            }
          }
        });
      }
      paintRef.current = paint;
      paint();
      let frame = 0;
      function tick(now: number) {
        frame = requestAnimationFrame(tick);
        if (state.open || state.intro || !state.visible || document.hidden)
          return;
        if (
          autoPlay &&
          items.length > 1 &&
          !state.pending &&
          !drag.current &&
          !state.hover &&
          !state.focus &&
          !state.paused &&
          !state.reduced &&
          !state.afterClose &&
          !tweenRef.current?.isActive() &&
          now - state.idle > Math.max(500, interval)
        ) {
          context.add(() => {
            tweenRef.current = gsap.to(state, {
              angle: Math.round(state.angle) + 1,
              duration: 1,
              ease: "power2.inOut",
              onComplete: () => {
                state.idle = performance.now();
              },
            });
          });
        }
        paint();
      }
      frame = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(frame);
        paintRef.current = () => {};
        clearTimeout(releaseTimer.current);
        resizeObserver.disconnect();
        intersection.disconnect();
        media.removeEventListener("change", onMotion);
        tweenRef.current?.kill();
        state.entered = false;
        state.intro = false;
        state.open = false;
        state.pending = false;
      };
    },
    {
      scope: sectionRef,
      dependencies: [cards, autoPlay, interval, initial, direction, catalogKey],
      revertOnUpdate: true,
    },
  );

  function moveTo(target: number, onComplete?: () => void) {
    contextSafe(() => {
      const state = control.current;
      tweenRef.current?.kill();
      state.idle = performance.now();
      state.afterClose = false;
      tweenRef.current = gsap.to(state, {
        angle: target,
        duration: state.reduced ? 0 : 0.7,
        ease: "power3.out",
        onUpdate: () => paintRef.current(),
        onComplete: contextSafe(() => {
          paintRef.current();
          state.idle = performance.now();
          onComplete?.();
        }),
      });
    })();
  }
  function select(slot: number) {
    contextSafe(() => {
      const state = control.current;
      if (blockedClick.current || state.open || state.pending) return;
      entranceRef.current?.progress(1);
      state.pending = true;
      const offset = wrapOffset(slot - state.angle, count);
      const open = () => {
        const card = cardRefs.current[slot];
        const trigger = card?.querySelector<HTMLButtonElement>("button");
        const item = cards[slot];
        if (!trigger || !item) {
          state.pending = false;
          return;
        }
        state.open = true;
        state.pending = false;
        const rect = card!.getBoundingClientRect();
        const { cardW: width, cardH: height } = layoutRef.current;
        onSelect({
          item,
          slot,
          trigger,
          origin: {
            left: rect.left + (rect.width - width) / 2,
            top: rect.top + (rect.height - height) / 2,
            width,
            height,
          },
          rotation: 0,
          scale: 1,
        });
        cardRefs.current.forEach((card, index) => {
          if (!card) return;
          gsap.set(card, {
            rotation:
              wrapOffset(index - state.angle, count) *
              layoutRef.current.angle *
              direction,
            yPercent: 0,
          });
          gsap.to(card, {
            opacity: 0,
            yPercent: index === slot ? 0 : 300,
            duration: state.reduced ? 0 : 0.5,
            ease: "power2.in",
          });
        });
        gsap.to(copyRef.current, {
          opacity: 0,
          y: -20,
          duration: state.reduced ? 0 : 0.5,
          ease: "power2.in",
        });
      };
      if (Math.abs(offset) > 0.01) moveTo(state.angle + offset, open);
      else open();
    })();
  }

  function restore(slot?: number) {
    contextSafe(() => {
      const state = control.current;
      if (slot !== undefined) state.angle = slot;
      cardRefs.current.forEach((card) => {
        if (card) {
          gsap.killTweensOf(card);
          gsap.set(card, { yPercent: 0, opacity: 1 });
        }
      });
      gsap.killTweensOf(copyRef.current);
      gsap.set(copyRef.current, { opacity: 1, y: 0 });
      state.open = false;
      state.afterClose = true;
      state.idle = performance.now();
      paintRef.current();
    })();
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      control.current.open ||
      control.current.pending ||
      (event.target as Element).closest("[data-playback]")
    )
      return;
    tweenRef.current?.kill();
    entranceRef.current?.progress(1);
    blockedClick.current = false;
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    control.current.idle = performance.now();
    control.current.afterClose = false;
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const now = performance.now();
    const delta =
      -(event.clientX - current.lastX) *
      layoutRef.current.sensitivity *
      direction;
    control.current.angle += delta;
    if (now > current.lastTime)
      current.velocity =
        0.6 * current.velocity + (delta / (now - current.lastTime)) * 6.4;
    current.lastX = event.clientX;
    current.lastTime = now;
    if (Math.abs(current.lastX - current.startX) > 8) {
      blockedClick.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.setPointerCapture(event.pointerId);
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (blockedClick.current)
      moveTo(
        Math.round(
          control.current.angle +
            10 * Math.max(-0.15, Math.min(0.15, current.velocity)),
        ),
      );
    control.current.idle = performance.now();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      blockedClick.current = false;
    }, 100);
  }
  function togglePause() {
    control.current.paused = !control.current.paused;
    control.current.afterClose = false;
    control.current.idle = performance.now();
    setPaused(control.current.paused);
  }

  function setHovered(value: boolean) {
    control.current.hover = value;
    control.current.idle = performance.now();
  }
  function setFocused(value: boolean) {
    control.current.focus = value;
    control.current.idle = performance.now();
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const state = control.current;
    if (state.open || state.pending) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(
        Math.round(state.angle) +
          (event.key === "ArrowRight" ? direction : -direction),
      );
    }
    if (event.target !== event.currentTarget) return;
    if (event.key === " ") {
      event.preventDefault();
      togglePause();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      select(state.active);
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveTo(event.key === "Home" ? 0 : items.length - 1);
    }
  }

  return {
    sectionRef,
    copyRef,
    cardRefs,
    innerRefs,
    layout,
    activeSlot,
    paused,
    cards,
    select,
    restore,
    togglePause,
    reducedMotion,
    setHovered,
    setFocused,
    keyDown,
    moveTo,
    pointerDown,
    pointerMove,
    pointerUp,
  };
}
