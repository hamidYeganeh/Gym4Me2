import { cva } from "class-variance-authority";
export const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-start text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pe-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_:is(svg,.sandow-icon)]:size-4 [&_:is(svg,.sandow-icon)]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-9 text-sm",
        sm: "h-8 text-xs",
        lg: "h-14 px-3 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const sidebarStyles = {
  sidebarProvider: cva(
    "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
  ),
  sidebar: cva(
    "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
  ),
  sidebar2: cva(
    "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
  ),
  sidebar3: cva("sr-only"),
  sidebar4: cva("flex h-full w-full flex-col"),
  sidebar5: cva("group peer hidden text-sidebar-foreground md:block"),
  sidebar6: cva(
    "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
  ),
  sidebar7: cva("group-data-[collapsible=offcanvas]:w-0"),
  sidebar8: cva("group-data-[side=right]:rotate-180"),
  sidebar9: cva("floating"),
  sidebar10: cva("inset"),
  sidebar11: cva(
    "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]",
  ),
  sidebar12: cva("group-data-[collapsible=icon]:w-(--sidebar-width-icon)"),
  sidebar13: cva(
    "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
  ),
  sidebar14: cva("floating"),
  sidebar15: cva("inset"),
  sidebar16: cva(
    "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
  ),
  sidebar17: cva(
    "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s",
  ),
  sidebar18: cva(
    "flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border",
  ),
  sidebarTrigger: cva("rtl:rotate-180"),
  sidebarTrigger2: cva("sr-only"),
  sidebarRail: cva(
    "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
  ),
  sidebarRail2: cva(
    "in-data-[side=left]:cursor-w-resize rtl:in-data-[side=left]:cursor-e-resize in-data-[side=right]:cursor-e-resize rtl:in-data-[side=right]:cursor-w-resize",
  ),
  sidebarRail3: cva(
    "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize rtl:[[data-side=left][data-state=collapsed]_&]:cursor-w-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize rtl:[[data-side=right][data-state=collapsed]_&]:cursor-e-resize",
  ),
  sidebarRail4: cva(
    "group-data-[collapsible=offcanvas]:translate-x-0 rtl:group-data-[collapsible=offcanvas]:-translate-x-0 group-data-[collapsible=offcanvas]:after:start-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
  ),
  sidebarRail5: cva("[[data-side=left][data-collapsible=offcanvas]_&]:-end-2"),
  sidebarRail6: cva(
    "[[data-side=right][data-collapsible=offcanvas]_&]:-start-2",
  ),
  sidebarInset: cva(
    "relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2",
  ),
  sidebarInput: cva("h-8 w-full bg-input/50 shadow-none"),
  sidebarHeader: cva("flex flex-col gap-2 p-2 [--radius:var(--radius-xl)]"),
  sidebarFooter: cva("flex flex-col gap-2 p-2"),
  sidebarSeparator: cva("mx-2 w-auto bg-sidebar-border"),
  sidebarContent: cva(
    "no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto [--radius:var(--radius-xl)] group-data-[collapsible=icon]:overflow-hidden",
  ),
  sidebarGroup: cva("relative flex w-full min-w-0 flex-col p-2"),
  sidebarGroupLabel: cva(
    "flex h-8 shrink-0 items-center rounded-xl px-3 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0  [&>:is(svg,.sandow-icon)]:size-4 [&>:is(svg,.sandow-icon)]:shrink-0",
  ),
  sidebarGroupAction: cva(
    "absolute top-3.5 end-3 flex aspect-square w-5 items-center justify-center rounded-xl p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  md:after:hidden [&>:is(svg,.sandow-icon)]:size-4 [&>:is(svg,.sandow-icon)]:shrink-0",
  ),
  sidebarGroupContent: cva("w-full text-sm"),
  sidebarMenu: cva("flex w-full min-w-0 flex-col gap-0.5"),
  sidebarMenuItem: cva("group/menu-item relative"),
  sidebarMenuAction: cva(
    "absolute top-1.5 end-1 flex aspect-square w-5 items-center justify-center rounded-xl p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-2 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  md:after:hidden [&>:is(svg,.sandow-icon)]:size-4 [&>:is(svg,.sandow-icon)]:shrink-0",
  ),
  sidebarMenuAction2: cva(
    "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0",
  ),
  sidebarMenuBadge: cva(
    "pointer-events-none absolute end-1 flex h-5 min-w-5 items-center justify-center rounded-xl px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground",
  ),
  sidebarMenuSkeleton: cva("flex h-8 items-center gap-2 rounded-xl px-2"),
  sidebarMenuSkeleton2: cva("size-4 rounded-xl"),
  sidebarMenuSkeleton3: cva("h-4 max-w-(--skeleton-width) flex-1"),
  sidebarMenuSub: cva(
    "mx-3.5 flex min-w-0 translate-x-px rtl:-translate-x-px flex-col gap-1 border-s border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
  ),
  sidebarMenuSubItem: cva("group/menu-sub-item relative"),
  sidebarMenuSubButton: cva(
    "flex h-7 min-w-0 -translate-x-px rtl:translate-x-px items-center gap-2 overflow-hidden rounded-xl px-3 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>:is(svg,.sandow-icon)]:size-4 [&>:is(svg,.sandow-icon)]:shrink-0 [&>:is(svg,.sandow-icon)]:text-sidebar-accent-foreground",
  ),
};
