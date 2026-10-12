import { cva } from "class-variance-authority";
export const comboboxVariants = cva("");

export const comboboxStyles = {
  comboboxTrigger: cva("[&_svg:not([class*='size-'])]:size-4"),
  comboboxTrigger2: cva("pointer-events-none size-4 text-muted-foreground"),
  comboboxClear: cva("pointer-events-none"),
  comboboxInput: cva("w-auto"),
  comboboxInput2: cva(
    "group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent",
  ),
  comboboxContent: cva("isolate z-50"),
  comboboxContent2: cva(
    "group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-3xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1.5 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/50 *:data-[slot=input-group]:shadow-none  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  ),
  comboboxList: cva(
    "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
  ),
  comboboxItem: cva(
    "relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pe-8 ps-3 text-sm font-medium outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  comboboxItem2: cva(
    "pointer-events-none absolute end-2 flex size-4 items-center justify-center",
  ),
  comboboxItem3: cva("pointer-events-none"),
  comboboxLabel: cva("px-3 py-2.5 text-xs text-muted-foreground"),
  comboboxEmpty: cva(
    "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
  ),
  comboboxSeparator: cva("-mx-1.5 my-1.5 h-px bg-border"),
  comboboxChips: cva(
    "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-transparent bg-input/50 bg-clip-padding px-3 py-1.5 text-sm transition-[color,box-shadow,background-color]    has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5  ",
  ),
  comboboxChip: cva(
    "flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-3xl bg-input px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pe-0 ",
  ),
  comboboxChip2: cva("-ms-1 opacity-50 hover:opacity-100"),
  comboboxChip3: cva("pointer-events-none"),
  comboboxChipsInput: cva("min-w-16 flex-1 outline-none"),
};
