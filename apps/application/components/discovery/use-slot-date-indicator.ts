"use client";
import { useLayoutEffect, useRef } from "react";

// transitions.dev tabs-sliding: measure the active tab; CSS owns the tween.
function positionIndicator(
  bar: HTMLDivElement | null,
  pill: HTMLSpanElement | null,
  animate: boolean,
) {
  const tab = bar?.querySelector<HTMLButtonElement>(
    '.t-tab[aria-selected="true"]',
  );
  if (!tab || !pill) return;
  if (!animate) {
    const previous = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    void pill.offsetWidth;
    pill.style.transition = previous;
  } else {
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
  }
  pill.dataset.positioned = "true";
}

export function useSlotDateIndicator(value: string, locale: string) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const previous = useRef({ value: "", locale });
  useLayoutEffect(() => {
    const animate =
      Boolean(previous.current.value) &&
      previous.current.locale === locale &&
      previous.current.value !== value;
    positionIndicator(bar.current, pill.current, animate);
    previous.current = { value, locale };
  }, [value, locale]);

  useLayoutEffect(() => {
    const element = bar.current;
    if (!element) return;
    const snap = () => positionIndicator(bar.current, pill.current, false);
    const observer = new ResizeObserver(snap);
    observer.observe(element);
    window.addEventListener("resize", snap);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", snap);
    };
  }, []);
  return { bar, pill };
}
