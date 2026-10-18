"use client";
import {
  defineTransition,
  LinearIntegrator,
  MultiAnimation,
  WebAnimation,
} from "@ssgoi/react";
import type { AnimationFactoryArgs } from "@ssgoi/react";
import { routeMotion } from "./lib/route-motion";
function build(
  { from, to }: AnimationFactoryArgs<object>,
  backward: boolean,
  fadeOnly = false,
  vertical = false,
) {
  const direction = document.documentElement.dir === "rtl" ? -1 : 1;
  const integrator = () =>
    new LinearIntegrator({
      durationSec: fadeOnly
        ? routeMotion.fade
        : vertical
          ? routeMotion.sheet
          : routeMotion.push,
    });
  const eased = (t: number) => 1 - (1 - t) ** 3;
  const track = (element: HTMLElement, incoming: boolean) => {
    const original = {
      transform: element.style.transform,
      opacity: element.style.opacity,
    };
    return new WebAnimation({
      element,
      integrator: integrator(),
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
  };
  return new MultiAnimation({ out: track(from, false), in: track(to, true) });
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
      integrator: new LinearIntegrator({ durationSec: 0 }),
      style: () => ({}),
    }),
    in: new WebAnimation({
      element: to,
      integrator: new LinearIntegrator({ durationSec: 0 }),
      style: () => ({}),
    }),
  });
}
export const lumaInstant = () =>
  defineTransition({
    forward: { animation: instant },
    backward: { animation: instant },
  });
