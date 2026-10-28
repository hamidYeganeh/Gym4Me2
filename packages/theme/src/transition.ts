"use client";

// Shape geometry adapted from the supplied Magic UI Animated Theme Toggler
// by Nazam Kalsi, chishiyac, and dikshantgulekar20-oss.
import { flushSync } from "react-dom";

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star";

function polygonCollapsed(point: string, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => point).join(", ");
  return `polygon(${pairs})`;
}

// All coordinates are percentages of the snapshot reference box: Chrome 150
// renders absolute px clip-path coordinates on ::view-transition-new(root)
// unscaled on fractional display scales (e.g. Windows 150%) for the first
// transition after load, so px values land at the wrong position (#989).
function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number,
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`;
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`;
  const point = (x: number, y: number) => `${toX(x)} ${toY(y)}`;
  // circle() percentage radii resolve against hypot(w, h) / sqrt(2) of the reference box.
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;

  switch (variant) {
    case "circle":
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ];
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "triangle": {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + 0.5 * scale),
        point(cx - dx, cy + 0.5 * scale),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`];
    }
    case "diamond": {
      // Slightly larger than the view-transition circle radius so axis-aligned coverage matches the circle reveal.
      const R = maxRadius * Math.SQRT2;
      const end = [
        point(cx, cy - R),
        point(cx + R, cy),
        point(cx, cy + R),
        point(cx - R, cy),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "hexagon": {
      const R = maxRadius * Math.SQRT2;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(point(cx + R * Math.cos(a), cy + R * Math.sin(a)));
      }
      return [
        polygonCollapsed(point(cx, cy), 6),
        `polygon(${verts.join(", ")})`,
      ];
    }
    case "rectangle": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const end = [
        point(cx - halfW, cy - halfH),
        point(cx + halfW, cy - halfH),
        point(cx + halfW, cy + halfH),
        point(cx - halfW, cy + halfH),
      ].join(", ");
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`];
    }
    case "star": {
      // Small overscan so the last frames never leave a 1px seam before the transition group ends.
      const R = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (radius: number) => {
        const verts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            point(
              cx + radius * Math.cos(outerA),
              cy + radius * Math.sin(outerA),
            ),
          );
          const innerA = outerA + Math.PI / 5;
          verts.push(
            point(
              cx + radius * innerRatio * Math.cos(innerA),
              cy + radius * innerRatio * Math.sin(innerA),
            ),
          );
        }
        return `polygon(${verts.join(", ")})`;
      };
      const startR = Math.max(2, R * 0.025);
      return [starPolygon(startR), starPolygon(R)];
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ];
  }
}

let activeTransition: ViewTransition | undefined;

/** next-themes owns persistence; this helper owns only the visual snapshot. */
export async function transitionTheme(
  origin: HTMLElement,
  applyTheme: () => void,
  {
    duration = 620,
    variant = "circle",
    fromCenter = false,
  }: {
    duration?: number;
    variant?: TransitionVariant;
    fromCenter?: boolean;
  } = {},
) {
  if (activeTransition) return;
  const root = document.documentElement;
  if (
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    duration <= 0
  ) {
    applyTheme();
    return;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rect = origin.getBoundingClientRect();
  const x = fromCenter ? width / 2 : rect.left + rect.width / 2;
  const y = fromCenter ? height / 2 : rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const clipPath = getThemeTransitionClipPaths(
    variant,
    x,
    y,
    radius,
    width,
    height,
  );
  const time = Math.min(Math.max(duration, 0), 2000);
  root.dataset.themeTransition = "active";
  root.style.setProperty("--theme-transition-from", clipPath[0]);
  root.style.setProperty("--theme-transition-duration", `${time}ms`);
  let animation: Animation | undefined;
  try {
    const transition = document.startViewTransition(() =>
      flushSync(applyTheme),
    );
    activeTransition = transition;
    // A skipped snapshot must still apply the theme and settle without an unhandled rejection.
    void transition.finished.catch(() => {});
    await transition.ready;
    animation = root.animate(
      { clipPath },
      {
        duration: time,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    await animation.finished;
    await transition.finished;
  } catch {
    activeTransition?.skipTransition();
  } finally {
    animation?.cancel();
    activeTransition = undefined;
    delete root.dataset.themeTransition;
    root.style.removeProperty("--theme-transition-from");
    root.style.removeProperty("--theme-transition-duration");
  }
}
