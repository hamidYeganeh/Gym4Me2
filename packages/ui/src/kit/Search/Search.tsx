"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "@repo/i18n";
import { MagnifyingGlassIcon, CloseXIcon } from "../../icons";
import { cn } from "../../lib/utils";
import type { InputProps } from "../Input/Input.types";

/* ══ Seek ═════════════════════════════════════════════════
   A search icon that becomes a search field.

   ONE OBJECT, NOT TWO. Everything here follows from that. The
   obvious build is an icon that fades out and an input that
   fades in, and it is obvious because it is easy — but two
   things swapping is never mistaken for one thing changing,
   however well the crossfade is tuned. So there is a single
   box whose WIDTH is the state, and the icon and the field
   are both inside it the whole time.

   Which turns the interesting problems into geometry rather
   than choreography:

   · The lens never moves relative to the box. It sits at a
     fixed inset from the left edge, and at the closed width
     that inset happens to centre it — (44 - 18) / 2 is 13,
     and 13 is also the padding the open field wants. So one
     number is both "centred in a circle" and "aligned in a
     field", and the lens travelling leftward across the page
     is not an animation anybody wrote. It is the box growing
     around a mark that stayed put.

   · The box grows from its middle, so the composition stays
     centred at every frame. Growing from the left would pin
     the lens and throw the field off-centre; growing from the
     right would slide the lens across the page. Neither is
     the object transforming, and both are what you get by
     accident.

   · Height never changes and the corner is fully round at
     every width, so the SHAPE is one rule rather than a tween
     with two ends. At 44 it is a circle and at 320 a pill,
     and those are the same statement. The radius used to
     interpolate 22 → 13, which was a second thing that had
     to agree with the first; a stadium corner needs no
     agreement at all.

   The press is a real beat. A click compresses the object for
   a moment before it expands, because a thing that yields
   before it moves reads as having been pushed, and a thing
   that only moves reads as having been triggered. */

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

/* 0..100 into the two numbers a spring actually has.

   50 is what Humidity and Brightness were tuned at, which is
   the rule every elastic knob on this bench follows — see
   lab/motion. Turn the panel to the middle and nothing has
   changed.

   Both ends have to be usable, which is what fixes the range:
   at 0 it is slow and heavy and still arrives, at 100 it is
   quick with a visible overshoot, and nowhere in between does
   it ring for longer than it takes to read. */
/* The pair is chosen by DAMPING RATIO and then written back
   as stiffness and decay, because the ratio is the thing a
   person is actually setting and the two numbers on their own
   do not say what they add up to.

     zeta = -ln(d) / (2 * sqrt(k))

   The first version of this ran 0.06..0.26 stiffness against
   0.93..0.74 decay, which reads as a sensible spread and is
   not one: it puts zeta between 0.15 and 0.16 across the
   WHOLE range, so every setting overshot by about sixty per
   cent and the knob only changed how fast it did it. Pull's
   return went 130px past its own resting position and lifted
   the content off the top of the card.

     0   → zeta ~0.85, heavy, arrives without a ring
     50  → zeta ~0.41, near where Humidity and Brightness sit
     100 → zeta ~0.20, lively, two visible rebounds

   Both ends shippable, which is the constraint that fixed the
   numbers rather than taste. */
const springOf = (tune: number) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

/* Units matter. The snap threshold is absolute, so a caller
   works in pixels or in 0..100 — a spring driven over 0..1
   would be "settled" before it had visibly moved. */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (
        Math.abs(target - cur.current) < 0.02 &&
        Math.abs(vel.current) < 0.02
      ) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    /* `tune` sits here beside `target` for the reason
       Brightness spells out: the loop closes over it, so
       without it a knob turned mid-flight would do nothing
       until something else restarted the effect. Restarting
       picks up from the refs, so it continues rather than
       snapping. */
  }, [target, tune, instant]);

  return at;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/* The closed object: a circle, so the width IS the height.
   Was 44, which is a header control — and this is not in a
   header, it is the whole component, sitting alone on a card
   with 96px of frame around it. At 44 the shut state read as a
   small button somebody had left in the middle of a large
   card. 60 is the size of the thing itself rather than the
   size it would be inside something else.

   The stylesheet reads this through --shut rather than
   repeating it: the skin's height and the closed width are the
   same number by definition, and two places holding it is two
   places to get it wrong. */
const SHUT = 64;
/* the lens, and its inset. See the note above — this number
   is doing two jobs and they agree by construction.

   28, measured against the rest of the bench rather than
   picked. Every round icon button here sits between 0.44 and
   0.50 of its button — .gdock-item 20/44, .bar-tool 17/38,
   .gnav-item 17/38, the nav's own 18/36 — and this button is
   64 across, so 28 puts it at 0.44, in with the others. 18
   was 0.28 and read as a small mark in a large circle.

   The STROKE is independent of this, which is the part I got
   wrong twice. The svg is an 18-unit viewBox, so a
   stroke-width of u units always draws at u/18 of the glyph's
   own size, whatever that size is — and lucide's 2-on-18 is
   the same 0.111. `stroke-width: 2` therefore matches the
   bench at any LENS, and resizing the icon does not disturb
   it. */
const LENS = 28;
const INSET = (SHUT - LENS) / 2;

/* the field's corner. 32 is half of its 64px height, which is
   the circle it is when shut and the pill it is when open. */
const CORNER = 32;

/* the resting field, wide screen and narrow. See the note on
   the `width` prop for why there are two.

   280 and not 240, which was the first answer and overshot:
   the button on a phone card is 64 x (260 / (field + 26)), so
   240 drew it at 63 against the 44 it started at — half again
   as big, which is a different component rather than a legible
   one. 280 lands at 54. The move that was actually wanted is
   the one you notice without being able to name it. */
const WIDE = 270; // + its 26px of frame fits the 300 standard block width

export function Search({
  give = 50,
  spring = 50,
  width: requestedWidth,
  corner = CORNER,
  expanded = true,
  label,
  onClear,
  className,
  style,
  ref: forwardedRef,
  ...props
}: Omit<InputProps, "width" | "label"> & {
  label?: ReactNode;
  give?: number;
  spring?: number;
  width?: number | string;
  corner?: number;
  expanded?: boolean;
  onClear?: () => void;
}) {
  const t = useTranslations("SearchInput");
  const width = typeof requestedWidth === "number" ? requestedWidth : undefined;
  const textLabel = typeof label === "string" ? label : undefined;
  const [span, setSpan] = useState(width ?? WIDE);
  const [localValue, setValue] = useState(String(props.defaultValue ?? ""));
  const value =
    props.value === undefined ? localValue : String(props.value ?? "");
  const frame = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const beat = useRef(0);
  const rest = useRef(0);

  const [open, setOpen] = useState(expanded || Boolean(value));
  const [press, setPress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lean, setLean] = useState({ x: 0, y: 0 });
  const still = useReducedMotion() ?? false;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () =>
      setSpan(
        Math.max(SHUT, Math.min(width ?? el.clientWidth, el.clientWidth)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  useEffect(() => {
    if (expanded || value) setOpen(true);
  }, [expanded, value]);
  useEffect(
    () => () => {
      window.clearTimeout(beat.current);
      window.clearTimeout(rest.current);
    },
    [],
  );

  useEffect(() => {
    const form = field.current?.form;
    if (!form || props.value !== undefined) return;
    const reset = () => setValue(String(props.defaultValue ?? ""));
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [props.defaultValue, props.value]);

  /* ── the width is the state ──────────────────────────────
     Tuned toward the top of the range by default: this is a
     control, and a control that wobbles reads as decoration.
     What the spring is for here is the tiny overshoot at the
     end — enough that the object arrives rather than stops,
     and not enough to notice as a bounce. */
  const target = open ? Math.max(SHUT, span) : SHUT;
  const w = useSpring(target, clamp(spring, 0, 100), still);

  /* how far through the transformation, 0 shut and 1 open */
  const p = clamp((w - SHUT) / Math.max(1, Math.max(SHUT, span) - SHUT), 0, 1);

  /* ── the magnet ──────────────────────────────────────────
     Measured from the FRAME, which never moves, and not from
     the object, which does. A vector read off a thing the
     vector is currently displacing is a feedback loop: it
     converges, but it converges by ringing, and the ring is
     visible as a shiver on an object this small.

     Off entirely once open. A field that drifts toward the
     pointer while you are trying to click into it is a field
     fighting you. */
  useEffect(() => {
    const el = frame.current;
    if (!el || open || still) return;
    let raf = 0;
    let at = { x: 0, y: 0 };
    const publish = () => {
      raf = 0;
      setLean(at);
    };
    const read = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      /* the wall draws this at a fraction and the canvas at a
         zoom; a radius measured in screen pixels would be a
         different radius at each */
      const k = b.width / (el.offsetWidth || b.width) || 1;
      const dx = (e.clientX - (b.left + b.width / 2)) / k;
      const dy = (e.clientY - (b.top + b.height / 2)) / k;
      const d = Math.hypot(dx, dy);
      const R = 110;
      if (d > R) {
        if (at.x || at.y) {
          at = { x: 0, y: 0 };
          if (!raf) raf = requestAnimationFrame(publish);
        }
        return;
      }
      /* A FEW PIXELS. The brief for this is "responsive, not
         following" and the difference is entirely in the
         ceiling: past about seven the object stops being a
         thing that acknowledges you and starts being a thing
         you are dragging around. */
      const pull = (1 - d / R) ** 1.4 * (2 + (give / 100) * 5);
      at = { x: (dx / (d || 1)) * pull, y: (dy / (d || 1)) * pull };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    const gone = () => {
      at = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    document.addEventListener("pointermove", read, { passive: true });
    document.addEventListener("pointerleave", gone);
    return () => {
      document.removeEventListener("pointermove", read);
      document.removeEventListener("pointerleave", gone);
      cancelAnimationFrame(raf);
    };
  }, [open, give, still]);

  /* ── opening ─────────────────────────────────────────────
     Compress, then expand, then focus. The order matters and
     the gap is short: 90ms is long enough to be felt as the
     object yielding and short enough that nobody waits for
     it. Focus lands with the expansion rather than at the end
     of it, so the caret is already there when the field
     arrives — waiting for the width to settle puts a visible
     pause between the box being ready and the box being
     usable. */
  /* ── THE OBJECT OPENING, HEARD ───────────────────────────
     `expand` and `collapse` are the bench's pair for a thing
     opening and closing, and this is the block that most
     obviously does both — a circle becoming a field and back.
     They land on the press and on the release rather than on
     the width settling: the sound belongs to the decision, not
     to the animation catching up with it. */
  const start = () => {
    if (open) return;
    setOpen(true);
    field.current?.focus();
    setPress(true);
    window.clearTimeout(beat.current);
    beat.current = window.setTimeout(
      () => {
        setPress(false);
        setOpen(true);
        field.current?.focus();
      },
      still ? 0 : 90,
    );
  };

  /* Away with nothing typed and it goes back. Away with
     something typed and it stays: the value IS the reason the
     field exists, and closing over it would either hide it or
     throw it away. */
  const away = () => {
    if (expanded || value.trim()) return;
    setOpen(false);
  };

  /* the lens acknowledges typing without performing it — one
     short beat per burst, not one per character */
  /* One short mark per BURST of typing, not one per key — the
     lens already works this way visually and the sound follows
     the same rule. A note per character is a typewriter, which
     is a different component. */
  const tapped = () => {
    setBusy(true);
    window.clearTimeout(rest.current);
    rest.current = window.setTimeout(() => setBusy(false), 340);
  };

  return (
    <div
      className={cn("sek", className)}
      ref={frame}
      data-open={open}
      data-press={press}
      data-busy={busy}
      data-flat={still || undefined}
      style={
        {
          ...style,
          "--sek-r": `${clamp(corner, 0, CORNER)}px`,
          "--w": `${w.toFixed(2)}px`,
          "--p": p.toFixed(3),
          /* the placeholder and the caret arrive in the last
           third, once there is somewhere for them to be */
          "--say": clamp((p - 0.55) / 0.45, 0, 1).toFixed(3),
          "--lx": `${lean.x.toFixed(2)}px`,
          "--ly": `${lean.y.toFixed(2)}px`,
          "--inset": `${INSET}px`,
          "--lens": `${LENS}px`,
          "--shut": `${SHUT}px`,
          /* ── THE FRAME FOLLOWS THE FIELD ──────────────────
           It was a fixed 440x116, sized for the widest the
           knob goes. The wall scales a component down by its
           BOUNDING BOX, so a frame sized for the maximum makes
           every smaller setting draw smaller — growing the
           object inside a fixed frame made the button on the
           card 35px where it had been 30, when the point was
           to make it considerably bigger.

           Tight to what is actually set, and the wall's own fit
           does the rest. It still never moves during an
           interaction: this changes with a knob, not with the
           open/shut state, which is what the magnet needs. */
          "--frame": "100%",
          "--frameh": `${SHUT}px`,
        } as React.CSSProperties
      }
    >
      <div className="sek-skin">
        {/* Gym4Me uses the shared Sandow duotone font for the lens. */}
        <span className="sek-lens" aria-hidden="true">
          <MagnifyingGlassIcon size={LENS} />
        </span>

        <InputPrimitive
          {...props}
          id={props.id}
          ref={(element) => {
            const input = element instanceof HTMLInputElement ? element : null;
            field.current = input;
            if (typeof forwardedRef === "function") forwardedRef(input);
            else if (forwardedRef) forwardedRef.current = input;
          }}
          className="sek-field"
          defaultValue={undefined}
          aria-hidden={!open || undefined}
          type="search"
          value={value}
          placeholder={props.placeholder ?? textLabel ?? t("search")}
          aria-label={
            props["aria-label"] ?? textLabel ?? props.placeholder ?? t("search")
          }
          /* This is a working search field: touch users get their software keyboard. */
          inputMode={props.inputMode ?? "search"}
          tabIndex={open ? props.tabIndex : -1}
          onChange={(e) => {
            setValue(e.target.value);
            props.onChange?.(e);
            tapped();
          }}
          onFocus={(e) => {
            setOpen(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            away();
            props.onBlur?.(e);
          }}
          onKeyDown={(e) => {
            props.onKeyDown?.(e);
            if (
              e.defaultPrevented ||
              e.nativeEvent.isComposing ||
              e.key !== "Escape"
            )
              return;
            // Preserve the query; callers such as comboboxes own Escape and selection.
            if (!expanded && !value) {
              e.preventDefault();
              setOpen(false);
              field.current?.blur();
            }
          }}
        />

        {/* The way in, and only while there is a way in. When
            the field is open this is the field's own job, and
            a second target sitting over it would swallow the
            click that places the caret. */}
        {onClear && value && open && (
          <button
            type="button"
            className="sek-clear"
            disabled={props.disabled}
            aria-label={t("clear")}
            onClick={() => {
              onClear();
              field.current?.focus();
            }}
          >
            <CloseXIcon size={18} />
          </button>
        )}
        {!open && (
          <button
            type="button"
            className="sek-hit"
            disabled={props.disabled}
            aria-label={textLabel ?? props["aria-label"] ?? t("search")}
            onClick={start}
          />
        )}
      </div>
    </div>
  );
}
