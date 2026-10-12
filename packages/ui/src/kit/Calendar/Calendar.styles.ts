import { cva } from "class-variance-authority";
export const calendarVariants = cva("");

export const calendarStyles = {
  calendar: cva(
    "group/calendar bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
  ),
  calendar2: cva("rtl:**:[.rdp-button_next>svg]:rotate-180"),
  calendar3: cva("rtl:**:[.rdp-button_previous>svg]:rotate-180"),
  calendar4: cva("rtl:rotate-180 size-4"),
  calendar5: cva("rtl:rotate-180 size-4"),
  calendar6: cva("size-4"),
  calendar7: cva(
    "flex size-(--cell-size) items-center justify-center text-center",
  ),
  calendarDayButton: cva(
    "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10    data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-e-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-s-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground  [&>span]:text-xs [&>span]:opacity-70",
  ),
};

export const calendarClassNames = {
  root1: cva("w-fit"),
  months2: cva("relative flex flex-col gap-4 md:flex-row"),
  month3: cva("flex w-full flex-col gap-4"),
  nav4: cva(
    "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
  ),
  buttonprevious5: cva(
    "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
  ),
  buttonnext6: cva(
    "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
  ),
  monthcaption7: cva(
    "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
  ),
  dropdowns8: cva(
    "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
  ),
  dropdownroot9: cva("relative rounded-(--cell-radius)"),
  dropdown10: cva("absolute inset-0 bg-popover opacity-0"),
  captionlabel11: cva("font-medium select-none"),
  captionlabel12: cva("text-sm"),
  captionlabel13: cva(
    "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
  ),
  monthgrid14: cva("w-full border-collapse"),
  weekdays15: cva("flex"),
  weekday16: cva(
    "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
  ),
  week17: cva("mt-2 flex w-full"),
  weeknumberheader18: cva("w-(--cell-size) select-none"),
  weeknumber19: cva("text-[0.8rem] text-muted-foreground select-none"),
  day20: cva(
    "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)",
  ),
  day21: cva(
    "[&:nth-child(2)[data-selected=true]_button]:rounded-s-(--cell-radius)",
  ),
  day22: cva(
    "[&:first-child[data-selected=true]_button]:rounded-s-(--cell-radius)",
  ),
  rangestart23: cva(
    "relative isolate z-0 rounded-s-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:end-0 after:w-4 after:bg-muted",
  ),
  rangemiddle24: cva("rounded-none"),
  rangeend25: cva(
    "relative isolate z-0 rounded-e-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:start-0 after:w-4 after:bg-muted",
  ),
  today26: cva(
    "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
  ),
  outside27: cva("text-muted-foreground aria-selected:text-muted-foreground"),
  disabled28: cva("text-muted-foreground opacity-50"),
  hidden29: cva("invisible"),
};
