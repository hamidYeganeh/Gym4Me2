import { cva } from "class-variance-authority";
export const contextMenuVariants = cva("");

export const contextMenuStyles = {
  contextMenuTrigger: cva("select-none"),
  contextMenuContent: cva(
    "z-50 max-h-(--radix-context-menu-content-available-height) min-w-48 origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5",
  ),
  contextMenuItem: cva(
    "group/context-menu-item relative flex cursor-default items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive  data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive",
  ),
  contextMenuSubTrigger: cva(
    "flex cursor-default items-center rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  contextMenuSubTrigger2: cva("rtl:rotate-180 ms-auto"),
  contextMenuSubContent: cva(
    "z-50 min-w-32 origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5",
  ),
  contextMenuCheckboxItem: cva(
    "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pe-8 ps-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  contextMenuCheckboxItem2: cva("pointer-events-none absolute end-2"),
  contextMenuRadioItem: cva(
    "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pe-8 ps-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  contextMenuRadioItem2: cva("pointer-events-none absolute end-2"),
  contextMenuLabel: cva(
    "px-3 py-2.5 text-xs text-muted-foreground data-inset:ps-9.5",
  ),
  contextMenuSeparator: cva("-mx-1.5 my-1.5 h-px bg-border/50"),
  contextMenuShortcut: cva(
    "ms-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground",
  ),
};
