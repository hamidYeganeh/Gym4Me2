import { cva } from "class-variance-authority";
export const menubarVariants = cva("");

export const menubarStyles = {
  menubar: cva("flex h-9 items-center rounded-3xl border p-1"),
  menubarTrigger: cva(
    "flex items-center rounded-2xl px-2 py-0.75 text-sm font-medium outline-hidden select-none hover:bg-muted aria-expanded:bg-muted",
  ),
  menubarContent: cva(
    "z-50 min-w-48 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
  ),
  menubarItem: cva(
    "group/menubar-item relative flex cursor-default items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:ps-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive  data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive!",
  ),
  menubarCheckboxItem: cva(
    "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pe-3 ps-9.5 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:ps-9.5 data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  menubarCheckboxItem2: cva(
    "pointer-events-none absolute start-3 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
  ),
  menubarRadioItem: cva(
    "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pe-3 ps-9.5 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:ps-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  menubarRadioItem2: cva(
    "pointer-events-none absolute start-3 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
  ),
  menubarLabel: cva(
    "px-3.5 py-2.5 text-xs text-muted-foreground data-inset:ps-9.5",
  ),
  menubarSeparator: cva("-mx-1 my-1 h-px bg-border/50"),
  menubarShortcut: cva(
    "ms-auto text-xs tracking-widest text-muted-foreground group-focus/menubar-item:text-accent-foreground",
  ),
  menubarSubTrigger: cva(
    "flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium outline-none select-none focus:bg-accent focus:text-accent-foreground data-inset:ps-9.5 data-open:bg-accent data-open:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
  ),
  menubarSubTrigger2: cva("rtl:rotate-180 ms-auto size-4"),
  menubarSubContent: cva(
    "z-50 min-w-32 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-3xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  ),
};
