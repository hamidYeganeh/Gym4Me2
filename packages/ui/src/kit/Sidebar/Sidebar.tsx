"use client";
import { useTranslations } from "@repo/i18n";
import { sidebarMenuButtonVariants, sidebarStyles } from "./Sidebar.styles";
import type {
  SidebarContentProps,
  SidebarContextProps,
  SidebarFooterProps,
  SidebarGroupActionProps,
  SidebarGroupContentProps,
  SidebarGroupLabelProps,
  SidebarGroupProps,
  SidebarHeaderProps,
  SidebarInputProps,
  SidebarInsetProps,
  SidebarMenuActionProps,
  SidebarMenuBadgeProps,
  SidebarMenuButtonProps,
  SidebarMenuItemProps,
  SidebarMenuProps,
  SidebarMenuSkeletonProps,
  SidebarMenuSubButtonProps,
  SidebarMenuSubItemProps,
  SidebarMenuSubProps,
  SidebarProps,
  SidebarProviderProps,
  SidebarRailProps,
  SidebarSeparatorProps,
  SidebarTriggerProps,
} from "./Sidebar.types";

import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import * as React from "react";

import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { Button } from "@repo/ui/kit/Button";
import { Input } from "@repo/ui/kit/Input";
import { Separator } from "@repo/ui/kit/Separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/kit/Sheet";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/kit/Tooltip";
import { PanelLeftIcon } from "lucide-react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(sidebarStyles.sidebarProvider(), className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: SidebarProps) {
  const t = useTranslations();
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(sidebarStyles.sidebar(), className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className={sidebarStyles.sidebar2()}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className={sidebarStyles.sidebar3()}>
            <SheetTitle>{t("Kit.sidebar")}</SheetTitle>
            <SheetDescription>{t("Kit.sidebarDescription")}</SheetDescription>
          </SheetHeader>
          <div className={sidebarStyles.sidebar4()}>{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={sidebarStyles.sidebar5()}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          sidebarStyles.sidebar6(),
          sidebarStyles.sidebar7(),
          sidebarStyles.sidebar8(),
          variant === sidebarStyles.sidebar9() ||
            variant === sidebarStyles.sidebar10()
            ? sidebarStyles.sidebar11()
            : sidebarStyles.sidebar12(),
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          sidebarStyles.sidebar13(),
          // Adjust the padding for floating and inset variants.
          variant === sidebarStyles.sidebar14() ||
            variant === sidebarStyles.sidebar15()
            ? sidebarStyles.sidebar16()
            : sidebarStyles.sidebar17(),
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={sidebarStyles.sidebar18()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
  const t = useTranslations();
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className={sidebarStyles.sidebarTrigger()} />
      <span className={sidebarStyles.sidebarTrigger2()}>
        {t("Kit.toggleSidebar")}
      </span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: SidebarRailProps) {
  const t = useTranslations();
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={t("Kit.toggleSidebar")}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={t("Kit.toggleSidebar")}
      className={cn(
        sidebarStyles.sidebarRail(),
        sidebarStyles.sidebarRail2(),
        sidebarStyles.sidebarRail3(),
        sidebarStyles.sidebarRail4(),
        sidebarStyles.sidebarRail5(),
        sidebarStyles.sidebarRail6(),
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(sidebarStyles.sidebarInset(), className)}
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: SidebarInputProps) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(sidebarStyles.sidebarInput(), className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(sidebarStyles.sidebarHeader(), className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn(sidebarStyles.sidebarFooter(), className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn(sidebarStyles.sidebarSeparator(), className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(sidebarStyles.sidebarContent(), className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn(sidebarStyles.sidebarGroup(), className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: SidebarGroupLabelProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(sidebarStyles.sidebarGroupLabel(), className)}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: SidebarGroupActionProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(sidebarStyles.sidebarGroupAction(), className)}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: SidebarGroupContentProps) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn(sidebarStyles.sidebarGroupContent(), className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(sidebarStyles.sidebarMenu(), className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn(sidebarStyles.sidebarMenuItem(), className)}
      {...props}
    />
  );
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: SidebarMenuActionProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        sidebarStyles.sidebarMenuAction(),
        showOnHover && sidebarStyles.sidebarMenuAction2(),
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({ className, ...props }: SidebarMenuBadgeProps) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(sidebarStyles.sidebarMenuBadge(), className)}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: SidebarMenuSkeletonProps) {
  // Random width between 50 to 90%.
  const [width] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(sidebarStyles.sidebarMenuSkeleton(), className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className={sidebarStyles.sidebarMenuSkeleton2()}
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className={sidebarStyles.sidebarMenuSkeleton3()}
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: SidebarMenuSubProps) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(sidebarStyles.sidebarMenuSub(), className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: SidebarMenuSubItemProps) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(sidebarStyles.sidebarMenuSubItem(), className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarStyles.sidebarMenuSubButton(), className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
