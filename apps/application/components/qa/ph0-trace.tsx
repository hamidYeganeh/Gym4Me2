"use client";
import { useEffect, useRef } from "react";
import { observeAppNavigation } from "../../lib/app-navigation";

/** Bounded QA recorder. No network, form values, or normal-build UI. */
export function Ph0Trace() {
  const output = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    let frame = 0;
    let capture: { started: number; events: unknown[] } | null = null;
    const status = (value: "recording" | "complete") =>
      window.dispatchEvent(
        new CustomEvent("gym4me:ph0-status", { detail: value }),
      );
    const event = (value: object) => {
      if (capture && capture.events.length < 200)
        capture.events.push({
          ms: +(performance.now() - capture.started).toFixed(2),
          ...value,
        });
    };
    const stopNavigationObserver = observeAppNavigation((value) =>
      event(value),
    );
    const click = (value: MouseEvent) => {
      const element =
        value.target instanceof Element
          ? value.target.closest("a,button")
          : null;
      if (!element) return;
      event({
        type: "click",
        tag: element.tagName,
        label: element.getAttribute("aria-label"),
        inactive: !!element.closest('[inert], [aria-hidden="true"]'),
        button: value.button,
      });
    };
    const record = () => {
      cancelAnimationFrame(frame);
      const started = performance.now();
      const startedAt = new Date().toISOString();
      capture = { started, events: [] };
      const events = capture.events;
      const samples: unknown[] = [];
      if (output.current)
        output.current.textContent = JSON.stringify({ status: "recording" });
      status("recording");
      const sample = () => {
        const now = performance.now();
        const boundaries = [
          ...document.querySelectorAll<HTMLElement>("[data-ssgoi-transition]"),
        ].filter(
          (element) =>
            !element.parentElement?.closest("[data-ssgoi-transition]"),
        );
        const routes = boundaries.map((element) => {
          const style = getComputedStyle(element);
          return {
            id: element.dataset.ssgoiTransition,
            inert: element.inert,
            hidden: element.getAttribute("aria-hidden"),
            transform: style.transform,
            opacity: style.opacity,
            filter: style.filter,
          };
        });
        const mains = [...document.querySelectorAll("main")].filter(
          (element) =>
            !element.closest('[inert], [aria-hidden="true"]') &&
            element.getClientRects().length > 0,
        );
        samples.push({
          ms: +(now - started).toFixed(2),
          path: location.pathname + location.search,
          reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
          theme: document.documentElement.dataset.themeTransition ?? null,
          activeMains: mains.length,
          interactiveRoutes: routes.filter(
            (route) => !route.inert && route.hidden !== "true",
          ).length,
          routes,
          dialogs: [...document.querySelectorAll('[role="dialog"]')].map(
            (element) => {
              const style = getComputedStyle(element);
              return {
                state: element.getAttribute("data-state"),
                hidden: element.getAttribute("aria-hidden"),
                transform: style.transform,
                duration: style.animationDuration,
              };
            },
          ),
        });
        if (now - started < 8000 && samples.length < 1000)
          frame = requestAnimationFrame(sample);
        else {
          if (output.current)
            output.current.textContent = JSON.stringify({
              status: "complete",
              startedAt,
              completedAt: new Date().toISOString(),
              durationMs: now - started,
              samples,
              events,
            });
          capture = null;
          status("complete");
        }
      };
      frame = requestAnimationFrame(sample);
    };
    window.addEventListener("gym4me:ph0-trace", record);
    document.addEventListener("click", click, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("gym4me:ph0-trace", record);
      document.removeEventListener("click", click, true);
      stopNavigationObserver();
    };
  }, []);
  return (
    <output ref={output} hidden aria-hidden="true" data-gym-ph0-trace>
      {'{"status":"ready"}'}
    </output>
  );
}
