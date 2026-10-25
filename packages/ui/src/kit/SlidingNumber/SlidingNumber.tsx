"use client";
import { useEffect } from "react";
import { SlidingNumber as AnimateSlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import {
  ReducedMotionConfig,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import useMeasure from "react-use-measure";
import { cn } from "../../lib/utils";
import {
  slidingNumberStyles as s,
  slidingNumberTransition,
} from "./SlidingNumber.styles";
import type { SlidingNumberProps } from "./SlidingNumber.types";

function NumberGlyph({
  value,
  number,
  height,
  label,
}: {
  value: MotionValue<number>;
  number: number;
  height: number;
  label: string;
}) {
  const y = useTransform(value, (latest) => {
    const offset = (10 + number - (latest % 10)) % 10;
    return (offset > 5 ? offset - 10 : offset) * height;
  });
  return (
    <motion.span
      className={s.number()}
      style={{ y, visibility: height ? "visible" : "hidden" }}
    >
      {label}
    </motion.span>
  );
}

function Digit({ digit, glyphs }: { digit: number; glyphs: string[] }) {
  const [ref, bounds] = useMeasure();
  const transition = useTempoTransition(slidingNumberTransition);
  // Match initiallyStable on the Latin renderer: new digits start at their value.
  const animated = useSpring(digit, transition);
  useEffect(() => {
    animated.set(digit);
  }, [animated, digit]);
  return (
    <span className={s.digit()}>
      <span ref={ref} className="invisible block">
        {glyphs[0]}
      </span>
      {!bounds.height && <span className={s.number()}>{glyphs[digit]}</span>}
      {glyphs.map((label, number) => (
        <NumberGlyph
          key={number}
          value={animated}
          number={number}
          height={bounds.height}
          label={label}
        />
      ))}
    </span>
  );
}

export function SlidingNumber(props: SlidingNumberProps) {
  const {
    value,
    locale = "en",
    padStart = false,
    useGrouping = false,
    decimalSeparator,
    className,
    ...spanProps
  } = props;
  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
  // The upstream roller renders Latin glyphs. Keep Persian/Arabic glyphs and
  // the kit's minimum-two-digit padding in the localized adapter.
  if (
    formatter.format(1234567890) === "1234567890" &&
    !padStart &&
    !useGrouping &&
    Number.isFinite(value)
  ) {
    const parts = formatter.formatToParts(value);
    return (
      <span
        {...spanProps}
        data-slot="sliding-number"
        className={cn(s.root(), className)}
        dir="ltr"
      >
        <AnimateSlidingNumber
          number={value}
          decimalPlaces={
            parts.find((part) => part.type === "fraction")?.value.length ?? 0
          }
          decimalSeparator={
            decimalSeparator ??
            parts.find((part) => part.type === "decimal")?.value ??
            "."
          }
          initiallyStable
        />
      </span>
    );
  }
  return (
    <ReducedMotionConfig>
      <LocalizedSlidingNumber {...props} />
    </ReducedMotionConfig>
  );
}

function LocalizedSlidingNumber({
  value,
  padStart = false,
  decimalSeparator,
  locale = "en",
  useGrouping = false,
  className,
  ...props
}: SlidingNumberProps) {
  const reduce = useShouldReduceMotion();
  const formatter = new Intl.NumberFormat(locale, {
    useGrouping,
    minimumIntegerDigits: padStart ? 2 : 1,
    maximumFractionDigits: 20,
  });
  const parts = formatter.formatToParts(value).map((part) => ({
    ...part,
    value:
      part.type === "decimal" && decimalSeparator !== undefined
        ? decimalSeparator
        : part.value,
  }));
  const text = parts.map((part) => part.value).join("");
  const glyphFormatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const glyphs = Array.from({ length: 10 }, (_, index) =>
    glyphFormatter.format(index),
  );
  return (
    <span
      {...props}
      data-slot="sliding-number"
      className={cn(s.root(), className)}
      dir="ltr"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={s.root()}>
        {reduce || !Number.isFinite(value)
          ? text
          : parts.map((part, partIndex) => (
              <span key={`${part.type}-${partIndex}`} className="inline-flex">
                {Array.from(part.value).map((glyph, index) => {
                  const digit = glyphs.indexOf(glyph);
                  return digit >= 0 ? (
                    <Digit
                      key={part.value.length - index}
                      digit={digit}
                      glyphs={glyphs}
                    />
                  ) : (
                    <span key={index}>{glyph}</span>
                  );
                })}
              </span>
            ))}
      </span>
    </span>
  );
}
