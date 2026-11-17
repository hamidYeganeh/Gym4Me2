"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { DayPicker } from "react-day-picker";

import type { CalendarProps } from "./Calendar.types";
import type { FC } from "react";

import { calendarSlots } from "./Calendar.styles";

const Calendar: FC<CalendarProps> = (props) => {
  const { className, classNames, dir, showOutsideDays = true, ...rest } = props;
  const direction = useDirection();
  const slots = calendarSlots();
  const defaults = Object.fromEntries(
    Object.entries(slots).map(([key, recipe]) => [key, recipe()]),
  );
  return (
    <DayPicker
      dir={dir ?? direction}
      showOutsideDays={showOutsideDays}
      {...rest}
      className={slots.root({ className })}
      classNames={{ ...defaults, ...classNames }}
    />
  );
};
export default Calendar;
