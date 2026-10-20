"use client";
import { defineTransition, MultiAnimation, WebAnimation } from "@ssgoi/react";
import type { AnimationFactoryArgs } from "@ssgoi/react";
import { zoom } from "@ssgoi/react/view-transitions";
import { routeMotion } from "./lib/route-motion";
import { routeIntegrator } from "./lib/route-integrator";
import { RouteAnimation } from "./lib/route-animation";
import { withClubMotionOrigin } from "./lib/club-motion-origin";

/** WAAPI bakes frames up front; a media change must finish the live execution. */
function respectReducedMotion<T extends MultiAnimation>(animation: T): T {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finish = () => {
    if (media.matches) animation.complete();
  };
  const dispose = animation.onDispose;
  animation.onDispose = (context) => {
    media.removeEventListener("change", finish);
    dispose?.(context);
  };
  media.addEventListener("change", finish);
  if (media.matches)
    for (const track of animation.tracks())
      track.set({ integrator: routeIntegrator(0) });
  return animation;
}
function build(
  { from, to }: AnimationFactoryArgs<object>,
  backward: boolean,
  fadeOnly = false,
  vertical = false,
) {
  const direction = document.documentElement.dir === "rtl" ? -1 : 1;
  const duration = fadeOnly
    ? routeMotion.fade
    : vertical
      ? routeMotion.sheet
      : routeMotion.push;
  const eased = (t: number) => 1 - (1 - t) ** 3;
  const track = (element: HTMLElement, incoming: boolean) => {
    const original = {
      transform: element.style.transform,
      opacity: element.style.opacity,
    };
    const animation = new WebAnimation({
      element,
      integrator: routeIntegrator(duration),
      motion: { handoffDuration: duration * 1000 },
      label: incoming ? "in" : "out",
      style: (progress) => {
        const t = eased(progress);
        // A small compositor-only travel avoids moving an entire screen width.
        const x = incoming
          ? (backward ? -12 : 16) * (1 - t)
          : (backward ? 8 : -4) * t;
        return {
          transform: fadeOnly
            ? "none"
            : vertical
              ? `translate3d(0,${x}px,0)`
              : `translate3d(${x * direction}px,0,0)`,
          opacity: incoming ? t : 1 - t,
        };
      },
      onDispose: (context) => {
        if (context.owns(element)) {
          element.style.transform = original.transform;
          element.style.opacity = original.opacity;
        }
      },
    });
    return animation;
  };
  return respectReducedMotion(
    new RouteAnimation(
      new MultiAnimation({ out: track(from, false), in: track(to, true) }),
      duration,
    ),
  );
}

/** Existing protected image anchors drive the shared visual; direct entry still pushes. */
export function lumaClub() {
  const preset = zoom({ type: "static", variant: "fade" });
  return {
    async prepare(args: Parameters<NonNullable<typeof preset.prepare>>[0]) {
      const detail = await (args.context.direction === "backward"
        ? args.from
        : args.to);
      // The App Router may commit its loading boundary before the hero arrives.
      // Wait briefly for the existing image anchor; slow/error pages still fall back.
      if (
        !args.signal?.aborted &&
        !detail.querySelector("[data-zoom-enter-key]")
      ) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            observer.disconnect();
            clearTimeout(timer);
            args.signal?.removeEventListener("abort", finish);
            resolve();
          };
          const observer = new MutationObserver(() => {
            if (detail.querySelector("[data-zoom-enter-key]")) finish();
          });
          const timer = setTimeout(finish, 500);
          observer.observe(detail, { childList: true, subtree: true });
          args.signal?.addEventListener("abort", finish, { once: true });
          args.onCleanup?.(finish);
          if (args.signal?.aborted) finish();
        });
      }
      return preset.prepare?.(args) ?? {};
    },
    animation(args: AnimationFactoryArgs<object>) {
      const animation = withClubMotionOrigin(
        args.from,
        args.to,
        args.context.direction === "backward",
        () => preset.animation(args),
      );
      if (!animation?.tracks().length)
        return build(args, args.context.direction === "backward");
      for (const track of animation.tracks()) {
        track.set({ integrator: routeIntegrator(routeMotion.push) });
        track.motion.handoffDuration = routeMotion.push * 1000;
      }
      return respectReducedMotion(new RouteAnimation(animation, routeMotion.push));
    },
  };
}
export const lumaPush = () =>
  defineTransition({
    forward: { animation: (args) => build(args, false) },
    backward: { animation: (args) => build(args, true) },
  });
export const lumaFade = () =>
  defineTransition({
    forward: { animation: (args) => build(args, false, true) },
    backward: { animation: (args) => build(args, true, true) },
  });

export const lumaSheet = () =>
  defineTransition({
    forward: { animation: (args) => build(args, false, false, true) },
    backward: { animation: (args) => build(args, true, false, true) },
  });

/** Keep SSGOI's history/scroll lifecycle while rendering no spatial/opacity frames. */
function instant({ from, to }: AnimationFactoryArgs<object>) {
  return new MultiAnimation({
    out: new WebAnimation({
      element: from,
      integrator: routeIntegrator(0),
      style: () => ({}),
    }),
    in: new WebAnimation({
      element: to,
      integrator: routeIntegrator(0),
      style: () => ({}),
    }),
  });
}
export const lumaInstant = () =>
  defineTransition({
    forward: { animation: instant },
    backward: { animation: instant },
  });
