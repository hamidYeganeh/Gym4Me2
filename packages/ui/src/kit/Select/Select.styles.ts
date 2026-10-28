import { cva } from "class-variance-authority";
export const selectVariants = cva("");

export const selectStyles = {
  selectGroup: cva("scroll-my-1.5 p-1.5"),
  selectTrigger: cva(
    "flex w-fit items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow,background-color] outline-none    disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5   [&_:is(svg,.sandow-icon)]:pointer-events-none [&_:is(svg,.sandow-icon)]:shrink-0 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4",
  ),
  selectTrigger2: cva("pointer-events-none size-4 text-muted-foreground"),
  selectContent: cva(
    "relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 data-[align-trigger=true]:animate-none",
  ),
  selectContent2: cva("popper"),
  selectContent3: cva(
    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 rtl:data-[side=left]:translate-x-1 data-[side=right]:translate-x-1 rtl:data-[side=right]:-translate-x-1 data-[side=top]:-translate-y-1",
  ),
  selectContent4: cva(
    "data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
  ),
  selectContent5: cva("popper"),
  selectContent6: cva(""),
  selectLabel: cva("px-3 py-2.5 text-xs text-muted-foreground"),
  selectItem: cva(
    "relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pe-8 ps-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_:is(svg,.sandow-icon)]:pointer-events-none [&_:is(svg,.sandow-icon)]:shrink-0 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  ),
  selectItem2: cva(
    "pointer-events-none absolute end-2 flex size-4 items-center justify-center",
  ),
  selectItem3: cva("pointer-events-none"),
  selectSeparator: cva("pointer-events-none -mx-1.5 my-1.5 h-px bg-border"),
  selectScrollUpButton: cva(
    "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4",
  ),
  selectScrollDownButton: cva(
    "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4",
  ),
};
