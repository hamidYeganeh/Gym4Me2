"use client";
import { sliderStyles } from "./Slider.styles";
import type { SliderProps } from "./Slider.types";

import { cn } from "@repo/ui/lib/utils";
import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(sliderStyles.slider(), className)}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={sliderStyles.slider2()}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={sliderStyles.slider3()}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={sliderStyles.slider4()}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
