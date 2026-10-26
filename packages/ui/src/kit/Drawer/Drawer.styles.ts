import { cva } from "class-variance-authority";
export const drawerVariants = cva("");

export const drawerStyles = {
  drawerOverlay: cva(
    "fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm",
  ),
  drawerContent: cva(
    "group/drawer-content fixed z-50 flex h-auto flex-col bg-transparent p-4 text-sm before:absolute before:inset-2 before:-z-10 before:rounded-4xl before:border before:border-border before:bg-popover before:shadow-xl data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:start-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:end-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
  ),
  drawerContent2: cva(
    "mx-auto mt-4 hidden h-1.5 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block",
  ),
  drawerHeader: cva(
    "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-start",
  ),
  drawerFooter: cva("mt-auto flex flex-col gap-2 p-4"),
  drawerTitle: cva("font-heading text-base font-medium text-foreground"),
  drawerDescription: cva("text-sm text-muted-foreground"),
};
