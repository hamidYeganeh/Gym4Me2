import { Button } from "@repo/ui/kit/Button";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { DayPicker, type DayButton, type Locale } from "react-day-picker";
import type { calendarVariants } from "./Calendar.styles";
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
};

export type CalendarDayButtonProps = React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>;
};

export type CalendarVariants = VariantProps<typeof calendarVariants>;
