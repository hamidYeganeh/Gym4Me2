import { cva } from "class-variance-authority";
export const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center rounded-3xl px-4.5 py-2.5 text-sm font-medium transition-all outline-none hover:bg-muted focus:bg-muted   focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted data-open:bg-muted/50 data-open:hover:bg-muted data-open:focus:bg-muted",
);

export const navigationMenuStyles = {
  navigationMenu: cva(
    "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
  ),
  navigationMenuList: cva(
    "group flex flex-1 list-none items-center justify-center gap-0",
  ),
  navigationMenuItem: cva("relative"),
  navigationMenuTrigger: cva("group"),
  navigationMenuTrigger2: cva(
    "relative top-px ms-1 size-3 transition duration-300 group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180",
  ),
  navigationMenuContent: cva(
    "top-0 start-0 w-full p-2.5 pe-3 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-3xl group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-lg group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:ring-foreground/5 group-data-[viewport=false]/navigation-menu:duration-300 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none md:absolute md:w-auto group-data-[viewport=false]/navigation-menu:",
  ),
  navigationMenuViewport: cva(
    "absolute top-full start-0 isolate z-50 flex justify-center",
  ),
  navigationMenuViewport2: cva(
    "origin-top-center relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-3xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 md:w-(--radix-navigation-menu-viewport-width)",
  ),
  navigationMenuLink: cva(
    "flex items-center gap-1.5 rounded-3xl p-3 text-sm transition-all outline-none hover:bg-muted focus:bg-muted   focus-visible:outline-none in-data-[slot=navigation-menu-content]:rounded-2xl data-[active=true]:bg-muted/50 data-[active=true]:hover:bg-muted data-[active=true]:focus:bg-muted [&_svg:not([class*='size-'])]:size-4",
  ),
  navigationMenuIndicator: cva(
    "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden",
  ),
  navigationMenuIndicator2: cva(
    "relative top-[60%] h-2 w-2 rotate-45 rounded-ss-sm bg-border shadow-md",
  ),
};
