"use client";

/* Smooth caret adapted from Skiper UI's Skiper106 by @gxuri.
   https://skiper-ui.com/v1/skiper106 — free version requires attribution.
   Base UI owns the actual input, value, events, validation and form behavior. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Input } from "../Input";
import { cn } from "../../lib/utils";
import type { SmoothInputProps } from "./SmoothInput.types";
import "./SmoothInput.css";

const selectionTypes = new Set(["text", "search", "password", "tel", "url"]);
const bidiText = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/;
const nativeCaretQuery =
  "(prefers-reduced-motion: reduce), (forced-colors: active)";
const prefersNativeCaret = () => window.matchMedia(nativeCaretQuery).matches;
function subscribeNativeCaret(onChange: () => void) {
  const media = window.matchMedia(nativeCaretQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function SmoothInput({
  ref: forwardedRef,
  wrapperClassName,
  className,
  reducedMotion = false,
  value,
  defaultValue,
  type = "text",
  dir,
  style,
  onChange,
  onFocus,
  onBlur,
  onSelect,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: SmoothInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const composing = useRef(false);
  const revealCaret = useRef(true);
  const visible = useRef(false);
  const [enhanced, setEnhanced] = useState(false);
  const systemNativeCaret = useSyncExternalStore(
    subscribeNativeCaret,
    prefersNativeCaret,
    () => true,
  );
  const caretX = useMotionValue(0);
  const springX = useSpring(caretX, { stiffness: 500, damping: 30, mass: 0.5 });
  const caretY = useMotionValue(0);
  const caretHeight = useMotionValue(16);
  const caretOpacity = useMotionValue(0);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") return forwardedRef(node);
      if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const hideCaret = useCallback(() => {
    visible.current = false;
    caretOpacity.set(0);
    setEnhanced(false);
  }, [caretOpacity]);

  const updateCaret = useCallback(() => {
    const reveal = revealCaret.current;
    revealCaret.current = false;
    const input = inputRef.current;
    const measure = measureRef.current;
    if (!input || !measure) return;

    const styles = window.getComputedStyle(input);
    // Native rendering handles bidi shaping, IME candidate windows, non-text
    // controls and accessibility preferences without guessing a caret position.
    if (
      document.activeElement !== input ||
      input.disabled ||
      input.readOnly ||
      composing.current ||
      reducedMotion ||
      systemNativeCaret ||
      !selectionTypes.has(input.type) ||
      input.selectionStart === null ||
      styles.direction === "rtl" ||
      (input.type !== "password" && bidiText.test(input.value))
    ) {
      hideCaret();
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd ?? start;
    const index = input.selectionDirection === "backward" ? start : end;
    const password = input.type === "password";
    const agent = navigator.userAgent;
    const bullet = /firefox|fxios/i.test(agent) ? "\u25cf" : "\u2022";
    let fontSize = styles.fontSize;
    // Safari draws its password bullets larger than its ordinary text glyphs.
    if (
      password &&
      bullet === "\u2022" &&
      !/chrome|chromium|crios/i.test(agent)
    ) {
      fontSize = `${parseFloat(fontSize) + 6.25}px`;
    }
    measure.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
    measure.style.letterSpacing = styles.letterSpacing;
    measure.style.fontFeatureSettings = styles.fontFeatureSettings;
    measure.style.fontVariationSettings = styles.fontVariationSettings;
    measure.style.textTransform = password ? "none" : styles.textTransform;
    const displayValue = password
      ? bullet.repeat(input.value.length)
      : input.value;
    const measureText = (text: string) => {
      measure.textContent = text;
      return measure.getBoundingClientRect().width;
    };

    const prefixWidth = measureText(displayValue.slice(0, index));
    const fullWidth = measureText(displayValue);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const contentWidth = input.clientWidth - paddingLeft - paddingRight;
    const spare = Math.max(0, contentWidth - fullWidth);
    const alignOffset =
      styles.textAlign === "center"
        ? spare / 2
        : styles.textAlign === "right" || styles.textAlign === "end"
          ? spare
          : 0;
    const absoluteX = paddingLeft + alignOffset + prefixWidth;
    // Native typing normally reveals the selection. Also cover controlled
    // replacements and paste, while preserving an intentional manual scroll.
    if (reveal) {
      const maxScroll = Math.max(0, input.scrollWidth - input.clientWidth);
      const right = input.scrollLeft + input.clientWidth - paddingRight;
      const left = input.scrollLeft + paddingLeft;
      if (absoluteX > right) {
        input.scrollLeft = Math.min(
          maxScroll,
          absoluteX - input.clientWidth + paddingRight,
        );
      } else if (absoluteX < left) {
        input.scrollLeft = Math.max(0, absoluteX - paddingLeft);
      }
    }
    const x = absoluteX - input.scrollLeft;
    const height = parseFloat(styles.fontSize) * 0.9;
    const nextX = input.offsetLeft + input.clientLeft + x;
    if (!visible.current) {
      caretX.jump(nextX);
      springX.jump(nextX);
    } else {
      caretX.set(nextX);
    }
    caretHeight.set(height);
    caretY.set(input.offsetTop + (input.offsetHeight - height) / 2);
    const inView =
      x >= paddingLeft - 1 && x <= input.clientWidth - paddingRight + 1;
    caretOpacity.set(start === end && inView ? 1 : 0);
    visible.current = true;
    setEnhanced(true);
  }, [
    caretHeight,
    caretOpacity,
    caretX,
    caretY,
    hideCaret,
    reducedMotion,
    springX,
    systemNativeCaret,
  ]);

  const scheduleCaret = useCallback(
    (reveal = true) => {
      revealCaret.current ||= reveal;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(updateCaret);
    },
    [updateCaret],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    let mounted = true;
    const refresh = () => {
      if (document.activeElement === input) scheduleCaret();
    };
    const onScroll = () => scheduleCaret(false);
    const observer = new ResizeObserver(refresh);
    observer.observe(input);
    const form = input.form;
    document.addEventListener("selectionchange", refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    input.addEventListener("scroll", onScroll);
    form?.addEventListener("reset", refresh);
    void document.fonts.ready.then(() => {
      if (mounted) refresh();
    });
    scheduleCaret();
    return () => {
      mounted = false;
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      document.removeEventListener("selectionchange", refresh);
      document.fonts.removeEventListener("loadingdone", refresh);
      input.removeEventListener("scroll", onScroll);
      form?.removeEventListener("reset", refresh);
    };
  }, [scheduleCaret]);

  useEffect(() => {
    scheduleCaret();
  }, [
    value,
    defaultValue,
    type,
    dir,
    className,
    style,
    props.disabled,
    props.readOnly,
    scheduleCaret,
  ]);

  return (
    <div
      data-slot="smooth-input"
      data-smooth-caret={enhanced || undefined}
      className={cn("smooth-input relative w-full min-w-0", wrapperClassName)}
    >
      <Input
        {...props}
        ref={setInputRef}
        type={type}
        dir={dir}
        value={value}
        defaultValue={defaultValue}
        className={className}
        style={style}
        onChange={(event) => {
          onChange?.(event);
          scheduleCaret();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          scheduleCaret();
        }}
        onBlur={(event) => {
          hideCaret();
          onBlur?.(event);
        }}
        onSelect={(event) => {
          onSelect?.(event);
          scheduleCaret();
        }}
        onCompositionStart={(event) => {
          composing.current = true;
          hideCaret();
          onCompositionStart?.(event);
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          onCompositionEnd?.(event);
          scheduleCaret();
        }}
      />
      <span
        ref={measureRef}
        aria-hidden="true"
        className="smooth-input-measure"
      />
      <span aria-hidden="true" className="smooth-input-caret-layer">
        <motion.span
          data-slot="smooth-input-caret"
          className="smooth-input-caret bg-primary"
          style={{
            x: springX,
            top: caretY,
            height: caretHeight,
            opacity: caretOpacity,
          }}
        />
      </span>
    </div>
  );
}
