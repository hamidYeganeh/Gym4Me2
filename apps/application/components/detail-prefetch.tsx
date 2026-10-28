"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  publicDetailTarget,
  usePublicDetailPrefetch,
} from "@repo/api/public-prefetch";

/** Warm visible public cards, prioritise intent, and keep the current page until its data is ready. */
export function DetailPrefetch() {
  const router = useRouter();
  const prefetchData = usePublicDetailPrefetch();
  useEffect(() => {
    let disposed = false,
      navigation = 0,
      active = 0,
      scanning = false;
    const observed = new WeakSet<HTMLAnchorElement>();
    const queue: HTMLAnchorElement[] = [];
    const warmed = new Map<string, { at: number; task: Promise<void> }>();
    const destination = (anchor: HTMLAnchorElement) => {
      if (
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.closest('[inert], [aria-hidden="true"]')
      )
        return null;
      let url: URL;
      try { url = new URL(anchor.href, location.href); } catch { return null; }
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return null;
      const href = `${url.pathname}${url.search}`;
      const target = publicDetailTarget(href);
      return target ? { href, target } : null;
    };
    const prepare = (anchor: HTMLAnchorElement) => {
      const next = destination(anchor);
      if (!next) return Promise.resolve();
      const existing = warmed.get(next.href);
      if (existing && Date.now() - existing.at < 30_000) return existing.task;
      router.prefetch(next.href);
      const task = prefetchData(next.target).catch(() => {
        /* The destination owns missing/unavailable errors. */
      });
      warmed.set(next.href, { at: Date.now(), task });
      if (warmed.size > 80) warmed.delete(warmed.keys().next().value!);
      return task;
    };
    const drain = () => {
      while (!disposed && active < 2 && queue.length) {
        const anchor = queue.shift()!;
        if (!anchor.isConnected || !destination(anchor)) continue;
        active++;
        void prepare(anchor).finally(() => {
          active--;
          drain();
        });
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const anchor = entry.target as HTMLAnchorElement;
            observer.unobserve(anchor);
            queue.push(anchor);
          }
        drain();
      },
      { rootMargin: "180px" },
    );
    const scan = () => {
      scanning = false;
      if (disposed) return;
      for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
        "a[href]",
      ))
        if (!observed.has(anchor) && destination(anchor)) {
          observed.add(anchor);
          observer.observe(anchor);
        }
    };
    const mutation = new MutationObserver(() => {
      if (!scanning) {
        scanning = true;
        queueMicrotask(scan);
      }
    });
    scan();
    mutation.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["inert", "aria-hidden"],
    });
    const anchorFor = (event: Event) =>
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    const intent = (event: Event) => {
      const anchor = anchorFor(event);
      if (anchor) void prepare(anchor);
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = anchorFor(event);
      if (!anchor) return;
      const ticket = ++navigation;
      const next = destination(anchor);
      // Accessible Back controls retain the app's history/scroll restoration behavior.
      if (!next || anchor.closest("nav,header")) return;
      event.preventDefault();
      anchor.setAttribute("aria-busy", "true");
      let timeout: ReturnType<typeof setTimeout>;
      const deadline = new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 2500);
      });
      void Promise.race([prepare(anchor), deadline]).finally(() => {
        clearTimeout(timeout);
        anchor.removeAttribute("aria-busy");
        if (!disposed && ticket === navigation)
          router.push(next.href, { scroll: false });
      });
    };
    const cancel = () => {
      navigation++;
    };
    document.addEventListener("pointerover", intent, true);
    document.addEventListener("focusin", intent, true);
    document.addEventListener("touchstart", intent, {
      passive: true,
      capture: true,
    });
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", cancel);
    return () => {
      disposed = true;
      navigation++;
      observer.disconnect();
      mutation.disconnect();
      document.removeEventListener("pointerover", intent, true);
      document.removeEventListener("focusin", intent, true);
      document.removeEventListener("touchstart", intent, true);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", cancel);
    };
  }, [router, prefetchData]);
  return null;
}
