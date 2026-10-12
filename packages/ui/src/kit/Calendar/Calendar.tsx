"use client";
import { calendarStyles, calendarClassNames } from "./Calendar.styles";
import type { CalendarDayButtonProps, CalendarProps } from "./Calendar.types";

import { cn } from "@repo/ui/lib/utils";
import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { Button, buttonVariants } from "@repo/ui/kit/Button";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        calendarStyles.calendar(),
        calendarStyles.calendar2(),
        calendarStyles.calendar3(),
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn(calendarClassNames.root1(), defaultClassNames.root),
        months: cn(calendarClassNames.months2(), defaultClassNames.months),
        month: cn(calendarClassNames.month3(), defaultClassNames.month),
        nav: cn(calendarClassNames.nav4(), defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          calendarClassNames.buttonprevious5(),
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          calendarClassNames.buttonnext6(),
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          calendarClassNames.monthcaption7(),
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          calendarClassNames.dropdowns8(),
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          calendarClassNames.dropdownroot9(),
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          calendarClassNames.dropdown10(),
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          calendarClassNames.captionlabel11(),
          captionLayout === "label"
            ? calendarClassNames.captionlabel12()
            : calendarClassNames.captionlabel13(),
          defaultClassNames.caption_label,
        ),
        month_grid: cn(
          calendarClassNames.monthgrid14(),
          defaultClassNames.month_grid,
        ),
        weekdays: cn(
          calendarClassNames.weekdays15(),
          defaultClassNames.weekdays,
        ),
        weekday: cn(calendarClassNames.weekday16(), defaultClassNames.weekday),
        week: cn(calendarClassNames.week17(), defaultClassNames.week),
        week_number_header: cn(
          calendarClassNames.weeknumberheader18(),
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          calendarClassNames.weeknumber19(),
          defaultClassNames.week_number,
        ),
        day: cn(
          calendarClassNames.day20(),
          props.showWeekNumber
            ? calendarClassNames.day21()
            : calendarClassNames.day22(),
          defaultClassNames.day,
        ),
        range_start: cn(
          calendarClassNames.rangestart23(),
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          calendarClassNames.rangemiddle24(),
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          calendarClassNames.rangeend25(),
          defaultClassNames.range_end,
        ),
        today: cn(calendarClassNames.today26(), defaultClassNames.today),
        outside: cn(calendarClassNames.outside27(), defaultClassNames.outside),
        disabled: cn(
          calendarClassNames.disabled28(),
          defaultClassNames.disabled,
        ),
        hidden: cn(calendarClassNames.hidden29(), defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn(calendarStyles.calendar4(), className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn(calendarStyles.calendar5(), className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn(calendarStyles.calendar6(), className)}
              {...props}
            />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className={calendarStyles.calendar7()}>{children}</div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: CalendarDayButtonProps) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        calendarStyles.calendarDayButton(),
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
