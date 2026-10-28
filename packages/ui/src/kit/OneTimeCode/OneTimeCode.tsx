"use client";

/* Adapted from Bencho One-time code (MIT): https://bencho.dev/licence.
   The demo answer knob is replaced by the actual authentication result. */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react";
import { CheckIcon as Check } from "../../icons";
import "./OneTimeCode.css";
import { normalizeOneTimeCode } from "./OneTimeCode.utils";

/* ══ One-time code ════════════════════════════════════════
   Six small cells and a caret. Digits rise into their cells;
   a right code draws the cells together until they fuse into
   one capsule that says so, and a wrong one sends a shiver
   down the row and drains the digits out.

   ── SIX CELLS, ONE FIELD ────────────────────────────────
   The same call the sign-in sheet makes, for the same reasons:
   six real inputs break paste, autofill from the notification,
   backspace and screen readers. So there is one invisible
   input over the row and the cells are drawn underneath it.

   ── THE MERGE IS THE GOO'S ──────────────────────────────
   The cells sit under a blur-and-threshold filter, far enough
   apart that it never bridges them. Verifying slides them to
   the middle while a capsule grows out of the same point: as
   they close, the filter joins them, and what is left is one
   shape. Nobody draws the in-between — it is the filter
   deciding when two things are close enough to be one.

   ── THE ANSWER IS A KNOB ────────────────────────────────
   A code nobody on the wall can know is not a demonstration.
   Accept and Reject are the two things the component does
   with a full row, so the panel picks which one you see. */

/* ── inlined from lab/motionkit ──────────────────────── */
/* ══ liquid ═══════════════════════════════════════════════
   Shared parts for the Framer Motion layer: one spring, one
   goo filter, one velocity→skew binding.

   ── why the filter is a hook ────────────────────────────
   The filter is embedded in each component's own return, but
   its id CANNOT be a literal. Every block here renders twice
   at once — once in the wall card, once in the detail overlay
   — and duplicate SVG ids do not scope, they collide: the
   second instance silently steals the first one's filter.
   useId() gives each mount its own name.

   ── what the goo can and cannot do ──────────────────────
   This is feGaussianBlur + feColorMatrix, not a shader. The
   matrix multiplies alpha by `cut` and subtracts half of it,
   so alpha below 0.5 lands on zero and everything above 0.536
   is fully opaque. That hard edge is what fuses nearby shapes
   into one blob — and it is also why this must never touch
   text: glyph antialiasing lives entirely below 0.5, so type
   under this filter loses its edges and then itself. */

function useGoo(blur = 7, cut = 28) {
  /* useId yields ":r0:" — legal in an id attribute but not in
     a url(#…) reference, so strip the colons. */
  const id = `goo-${useId().replace(/:/g, "")}`;
  const goo = (
    <svg className="liq-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id={id}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={blur}
            result="smear"
          />
          <feColorMatrix
            in="smear"
            type="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${cut} ${-(cut / 2)}`}
          />
        </filter>
      </defs>
    </svg>
  );
  return { id, url: `url(#${id})`, goo };
}

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Production integration subscribes after hydration so this preference also
   follows a system setting changed while the field is already mounted. */
function subscribeStillness(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/* how long a cell takes to swell and settle when a digit lands */
const POP_MS = 260;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const u = clamp((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/* a cell, and the air between two */
const W = 36;
const H = 44;
const G = 7;
/* the capsule a right code becomes */
const CAP = 128;
/* ── the merge is a SPRING, not a tween ─────────────────
   It was a 560ms ease-in-out, which arrived and stopped. A
   spring a little under critical lets the capsule run past its
   size and come back — stretching long and thin on the way out
   and settling round — which is what makes the fuse read as
   liquid rather than as boxes sliding. Per frame at 60Hz, from
   a stiffness and a damping ratio, as spring.ts does. */
const MERGE = (() => {
  const k = 0.075;
  const zeta = 0.42;
  return { k, d: 1 - 2 * zeta * Math.sqrt(k) };
})();
const SHAKE_MS = 620;

type Phase = "type" | "check" | "ok" | "no";

export type OneTimeCodeProps = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "size" | "maxLength" | "type" | "defaultValue"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Reports a complete normalized code; never submits or changes status. */
  onComplete?: (code: string) => void;
  length?: 4 | 5 | 6;
  status?: "idle" | "verifying" | "success" | "error";
  verifiedLabel?: string;
  corner?: number;
  /** Reduce motion in-app as well as respecting the system preference. */
  reducedMotion?: boolean;
};

export function OneTimeCode({
  value: code,
  onValueChange,
  onComplete,
  length = 5,
  status = "idle",
  verifiedLabel = "Verified",
  corner = 12,
  reducedMotion = false,
  disabled,
  readOnly = false,
  className,
  onFocus,
  onBlur,
  onPaste,
  ref: forwardedRef,
  ...inputProps
}: OneTimeCodeProps) {
  const n = Math.round(clamp(length, 4, 6));
  const r = clamp(corner, 0, H / 2);
  const rowW = n * W + (n - 1) * G;
  const completedCode = useRef<string | null>(null);
  useEffect(() => {
    const normalized = normalizeOneTimeCode(code, n);
    if (normalized.length !== n) {
      completedCode.current = null;
      return;
    }
    if (completedCode.current === normalized) return;
    // Track before notifying, so parent renders and new callback identities do
    // not repeat completion. Watching the value also covers SMS autofill.
    completedCode.current = normalized;
    onComplete?.(normalized);
  }, [code, n, onComplete]);
  const systemStill = useSyncExternalStore(
    subscribeStillness,
    stillness,
    () => false,
  );
  const still = systemStill || reducedMotion;

  const [phase, setPhase] = useState<Phase>("type");
  const [focus, setFocus] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      if (typeof forwardedRef === "function") return forwardedRef(node);
      if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  /* moving parts, read by the loop */
  const caret = useRef({ x: W / 2, v: 0 });
  /* when each cell last took a digit — for the little swell */
  const popAt = useRef<number[]>([]);
  const merge = useRef({ m: 0, v: 0, to: 0 });
  const shook = useRef(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const [, setTick] = useState(0);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const live = useRef({ code, n });
  live.current = { code, n };

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /* ── the one loop ────────────────────────────────────────
     Runs while something moves and stops itself after, so a
     row nobody is typing into costs nothing. */
  const wake = useCallback(() => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      let busy = false;
      const { code: c, n: count } = live.current;

      /* the caret, on a spring with a little give */
      const target = Math.min(c.length, count - 1) * (W + G) + W / 2;
      const k = caret.current;
      if (still) {
        k.x = target;
        k.v = 0;
      } else {
        k.v += (target - k.x) * 0.2 * dt;
        k.v *= Math.pow(0.62, dt);
        k.x += k.v * dt;
        if (Math.abs(target - k.x) < 0.05 && Math.abs(k.v) < 0.05) {
          k.x = target;
          k.v = 0;
        } else busy = true;
      }

      /* the merge, sprung */
      const mg = merge.current;
      if (mg.m !== mg.to || mg.v !== 0) {
        if (still) {
          mg.m = mg.to;
          mg.v = 0;
        } else {
          mg.v += (mg.to - mg.m) * MERGE.k * dt;
          mg.v *= Math.pow(MERGE.d, dt);
          mg.m += mg.v * dt;
          if (Math.abs(mg.to - mg.m) < 0.0008 && Math.abs(mg.v) < 0.0008) {
            mg.m = mg.to;
            mg.v = 0;
          } else busy = true;
        }
      }

      if (phaseRef.current === "check" || t - shook.current < SHAKE_MS + 200)
        busy = true;

      setTick((x) => x + 1);
      /* a cell still swelling from a digit keeps the loop alive */
      if (popAt.current.some((at) => t - at < POP_MS)) busy = true;
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  }, [still]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );
  useEffect(() => {
    // A new reduced-motion preference must replace an already-running loop.
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    wake();
  }, [code, n, phase, wake]);

  /* A full row is not proof of identity. Only the server may trigger the
     success capsule; checking lasts exactly as long as the real request. */
  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    merge.current.to = status === "success" ? 1 : 0;
    if (status === "success") {
      setPhase("ok");
      input.current?.blur();
    } else if (status === "verifying") {
      setPhase("check");
    } else if (status === "error") {
      setPhase("no");
      shook.current = performance.now();
      later(
        () => {
          onValueChange("");
          setPhase("type");
        },
        still ? 0 : SHAKE_MS + n * 45 + 160,
      );
    } else {
      setPhase("type");
    }
    wake();
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [status, n, onValueChange, still, wake, later]);

  const onChange = (raw: string) => {
    if (phase !== "type" || disabled || readOnly) return;
    const next = normalizeOneTimeCode(raw, n);
    /* each new digit swells its cell — a paste runs along the row */
    if (!still && next.length > code.length) {
      const t0 = performance.now();
      for (let i = code.length; i < next.length; i++)
        popAt.current[i] = t0 + (i - code.length) * 45;
      wake();
    }
    onValueChange(next);
  };

  /* pressing the capsule splits it back into empty cells */
  // Authentication owns success; an authenticated row cannot reopen itself.

  /* ── where everything is this frame ──────────────────────── */
  const now = performance.now();
  /* the raw spring runs past 0 and 1; the cells' travel is
     clamped to it, and only the capsule is allowed to take the
     overshoot, as a stretch */
  const raw = merge.current.m;
  const m = clamp(raw, 0, 1);
  const em = m;
  const home = (i: number) => i * (W + G);
  const mid = (rowW - W) / 2;
  const since = now - shook.current;
  const shaking = phase === "no" && since < SHAKE_MS && !still;
  const shake = (i: number) =>
    shaking
      ? 5 *
        Math.exp(-since / 190) *
        Math.sin((since / 1000) * Math.PI * 2 * 10 + i * 0.55)
      : 0;
  const cellX = (i: number) => mix(home(i), mid, em) + shake(i);
  /* ── a digit arriving ─────────────────────────────────────
     The cell that takes it swells a touch and settles: up and
     back on one half-sine, four per cent at the top. Small on
     purpose — it is an acknowledgement, not an event. */
  const pop = (i: number) => {
    const at = popAt.current[i];
    if (at === undefined) return 1;
    const u = (now - at) / POP_MS;
    return u > 0 && u < 1 ? 1 + 0.04 * Math.sin(Math.PI * u) : 1;
  };
  /* checking: a soft wave of breath through the cells */
  const breath = (i: number) => {
    if (phase !== "check" || still) return pop(i);
    const u = ((now % 900) / 900) * (n + 2) - i;
    return 1 - 0.07 * (u > 0 && u < 2 ? Math.sin((u / 2) * Math.PI) : 0);
  };
  const over = raw - 1;
  /* long and thin past its size, round again as it settles:
     width and height trade, so it reads as one soft thing */
  const capW = CAP * smooth(0.3, 1, m) * (1 + Math.max(-0.12, over) * 0.9);
  const capSy = 1 - Math.max(-0.12, over) * 0.55;
  /* cells round off into the capsule's pill as they close in,
     so the two shapes agree by the time the goo joins them */
  const cellR = mix(r, H / 2, smooth(0.15, 0.7, m));
  const typing = phase === "type" && focus;

  const { url, goo } = useGoo(3, 24);

  return (
    <div
      className="one-time-code"
      data-phase={phase}
      data-reduced-motion={still || undefined}
      dir="ltr"
      data-gym-focus-proxy
      aria-busy={status === "verifying" || undefined}
    >
      <div className="otp-row" style={{ width: rowW, height: H }}>
        {/* the cells and the capsule: one colour, under the filter */}
        <div
          className="otp-goo"
          aria-hidden="true"
          style={{ filter: still ? undefined : url }}
        >
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className="otp-cell"
              style={{
                width: W,
                borderRadius: cellR,
                transform: `translateX(${cellX(i).toFixed(2)}px) scale(${breath(i).toFixed(3)})`,
              }}
            />
          ))}
          {capW > 0.5 && (
            <span
              className="otp-cell"
              /* always a full pill — the capsule is a result, not
                 a cell, and wears the rounded shape whatever the
                 Corner knob says the cells are */
              style={{
                width: capW,
                borderRadius: H / 2,
                transform: `translateX(${((rowW - capW) / 2).toFixed(2)}px) scaleY(${capSy.toFixed(3)})`,
              }}
            />
          )}
        </div>

        {/* the digits — an empty cell is just the cell */}
        {Array.from({ length: n }, (_, i) => {
          const d = code[i];
          const x = cellX(i);
          /* a wrong code drains right to left */
          const out =
            phase === "no" && !still
              ? smooth(0, 1, (since - 300 - (n - 1 - i) * 45) / 220)
              : 0;
          return (
            <span
              key={i}
              aria-hidden="true"
              className="otp-slot"
              style={{
                width: W,
                borderRadius: cellR,
                transform: `translateX(${x.toFixed(2)}px)`,
                opacity: 1 - smooth(0, 0.45, m),
              }}
            >
              {d && (
                <span
                  key={`${i}-${d}`}
                  className="otp-digit"
                  style={{
                    translate: `0 ${(out * 8).toFixed(2)}px`,
                    opacity: 1 - out,
                  }}
                >
                  {d}
                </span>
              )}
            </span>
          );
        })}

        {/* the caret, stretched by its own speed */}
        <i
          aria-hidden="true"
          className="otp-caret"
          /* not until the cells have come apart again, or it
             stands in an empty slot the capsule is still on */
          data-on={typing && code.length < n && m < 0.08}
          style={{
            transform: `translateX(${(caret.current.x - 1).toFixed(2)}px) scaleX(${(1 + Math.min(5, Math.abs(caret.current.v) * 0.9)).toFixed(3)})`,
          }}
        />

        {/* what the capsule says */}
        <span
          role="status"
          aria-live="polite"
          aria-hidden={phase !== "ok"}
          className="otp-ok"
          style={{
            opacity: smooth(0.72, 1, m),
            scale: `${mix(0.92, 1, smooth(0.72, 1, m))}`,
          }}
        >
          <Check size={14} strokeWidth={2} aria-hidden="true" />
          {verifiedLabel}
        </span>

        <input
          ref={setInputRef}
          className={["otp-field", className].filter(Boolean).join(" ")}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(event) => {
            onPaste?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            onChange(event.clipboardData.getData("text"));
          }}
          onFocus={(event) => {
            setFocus(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocus(false);
            onBlur?.(event);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          /* a code box is not a login: keep the password managers'
             badges out of it, the way each of them asks */
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          maxLength={n}
          disabled={disabled || status === "success" || status === "verifying"}
          readOnly={readOnly || phase === "no"}
          type="text"
          {...inputProps}
          spellCheck={false}
        />
      </div>
      {goo}
    </div>
  );
}
