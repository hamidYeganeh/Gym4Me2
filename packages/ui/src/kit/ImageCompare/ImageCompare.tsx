"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { ArrowHorizontalIcon } from "../../icons";

/* ══ Image compare ════════════════════════════════════════
   One picture, two states of it, and a line to drag across.
   Left of the line is the raw shot, right of it the edit. Drag
   slowly and it stays where you leave it; flick it and it
   glides to the edge you threw it at.

   ── TWO PICTURES, ONE FRAME ─────────────────────────────
   The x-ray and the colour photograph are the same scene at the
   same size, so the two halves line up exactly and the line
   reads as seeing through the picture.

   ── THE LINE IS JELLY ───────────────────────────────────
   The knob is exactly where the finger is; the two ends of the
   line are not. They follow it on an under-damped spring, so a
   hard swing leaves them behind and the line bows into a curve,
   then wobbles straight when you stop. The before layer is cut
   along the SAME curve — clip-path: path(), in the block's own
   pixels — so the picture's edge bends with the line rather than
   the line bending over a straight cut.

   ── THE LAYERS DRIFT ────────────────────────────────────
   The back layer moves a few pixels against the line as it
   goes, so the wipe reads as two sheets with depth between them
   rather than a mask sliding over a flat picture. */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export function ImageCompare({
  before,
  after,
  description,
  /* show the Before and After tags */
  labels = true,
  corner = 20,
}: {
  before: string;
  after: string;
  description?: string;
  labels?: boolean;
  corner?: number;
}) {
  const t = useTranslations("CoachSamples");
  const [size, setSize] = useState({ width: 270, height: 360 });
  const W = size.width,
    H = size.height;
  const reduced = useRef(false);
  const [p, setP] = useState(0.5);
  const [bend, setBend] = useState(0);
  const cur = useRef(0.5);
  const target = useRef<number | null>(null);
  /* the ends of the line, and how fast they are moving */
  const ends = useRef({ x: 0.5, v: 0 });
  const raf = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ v: number; t: number; last: number } | null>(null);
  const [held, setHeld] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [before, after]);
  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      reduced.current = media.matches;
    };
    preference();
    media.addEventListener("change", preference);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", preference);
    };
  }, []);

  /* one loop for both motions: the glide toward a target, and
     the ends catching up with the middle. It stops itself once
     everything is still. */
  const loop = () => {
    if (reduced.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      cur.current = target.current ?? cur.current;
      target.current = null;
      ends.current = { x: cur.current, v: 0 };
      setP(cur.current);
      setBend(0);
      return;
    }
    if (raf.current) return;
    let prev = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.033, (t - prev) / 1000);
      prev = t;
      if (target.current !== null) {
        cur.current +=
          (target.current - cur.current) * (1 - Math.pow(0.0004, dt));
        if (Math.abs(target.current - cur.current) < 0.0005) {
          cur.current = target.current;
          target.current = null;
        }
      }
      /* the jelly: a spring from the ends to the middle, damped
         firmly enough that it flexes and settles without a wobble */
      const e = ends.current;
      e.v += ((cur.current - e.x) * 620 - e.v * 44) * dt;
      e.x += e.v * dt;
      setP(cur.current);
      setBend(clamp((cur.current - e.x) * W * 0.5, -9, 9));
      const still =
        target.current === null &&
        Math.abs(cur.current - e.x) < 0.0006 &&
        Math.abs(e.v) < 0.002;
      if (still) {
        e.x = cur.current;
        e.v = 0;
        setBend(0);
        raf.current = 0;
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const glide = (to: number) => {
    target.current = to;
    loop();
  };
  /* under the finger: the knob is drawn this frame, not the next —
     only the ends are left to the loop */
  const place = (v: number) => {
    target.current = null;
    cur.current = v;
    setP(v);
    loop();
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const at = (cx: number) => {
    const r = box.current!.getBoundingClientRect();
    return clamp((cx - r.left) / r.width, 0, 1);
  };

  const r = clamp(corner, 0, 28);
  /* the line as a curve: ends at x - bend, and a control point at
     x + bend so the curve passes exactly through the knob */
  const x = p * W;
  const top = x - bend;
  const curve = `M ${top.toFixed(2)} 0 Q ${(x + bend).toFixed(2)} ${H / 2} ${top.toFixed(2)} ${H}`;
  const cut = `path("M 0 0 L ${top.toFixed(2)} 0 Q ${(x + bend).toFixed(2)} ${H / 2} ${top.toFixed(2)} ${H} L 0 ${H} Z")`;

  return (
    <div
      ref={box}
      className="cmp"
      data-held={held || undefined}
      role="slider"
      tabIndex={0}
      aria-label={description ?? t("compare")}
      aria-valuetext={t("position", { value: Math.round(p * 100) })}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      style={
        {
          width: "100%",
          aspectRatio: "3 / 4",
          borderRadius: r,
          "--p": p,
        } as React.CSSProperties
      }
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.focus();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* a scripted pointer */
        }
        const v = at(e.clientX);
        drag.current = { v: 0, t: performance.now(), last: v };
        setHeld(true);
        glide(v);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const v = at(e.clientX);
        const now = performance.now();
        d.v = (v - d.last) / Math.max(1, now - d.t);
        d.t = now;
        d.last = v;
        place(v);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        setHeld(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* never captured */
        }
        /* a flick carries it to the edge it was thrown at */
        if (
          d &&
          performance.now() - d.t < 90 &&
          Math.abs(d.v) > 0.0025 &&
          !reduced.current
        ) {
          glide(d.v > 0 ? 1 : 0);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setHeld(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Home") {
          e.preventDefault();
          glide(0);
        }
        if (e.key === "End") {
          e.preventDefault();
          glide(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          glide(clamp((target.current ?? cur.current) - 0.1, 0, 1));
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          glide(clamp((target.current ?? cur.current) + 0.1, 0, 1));
        }
      }}
    >
      {/* the edit underneath, drifting a little with the line */}
      <img
        className="cmp-img cmp-after"
        src={after}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        draggable={false}
      />
      {/* the raw shot on top, cut off at the line */}
      <div className="cmp-before" style={{ clipPath: cut }}>
        <img
          className="cmp-img"
          src={before}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          draggable={false}
        />
      </div>
      {failed && (
        <span className="cmp-error" role="status">
          {t("imageUnavailable")}
        </span>
      )}
      {labels && (
        <>
          <span
            className="cmp-tag"
            style={{ opacity: clamp((p - 0.14) * 4, 0, 1) }}
          >
            {t("before")}
          </span>
          <span
            className="cmp-tag cmp-right"
            style={{ opacity: clamp((0.86 - p) * 4, 0, 1) }}
          >
            {t("after")}
          </span>
        </>
      )}
      <svg
        className="cmp-line"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
      >
        <path d={curve} />
      </svg>
      <span className="cmp-grip" style={{ left: x }}>
        <span className="cmp-knob">
          <ArrowHorizontalIcon size={18} />
        </span>
      </span>
    </div>
  );
}
