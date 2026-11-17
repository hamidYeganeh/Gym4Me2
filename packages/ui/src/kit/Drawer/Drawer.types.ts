import type { Drawer as Primitive } from "@base-ui/react/drawer";
import type { ComponentPropsWithRef } from "react";

export type DrawerProps<Payload = unknown> = Primitive.Root.Props<Payload>;
export type DrawerTriggerProps<Payload = unknown> = Primitive.Trigger.Props<Payload>;
export type DrawerPortalProps = ComponentPropsWithRef<typeof Primitive.Portal>;
export type DrawerOverlayProps = ComponentPropsWithRef<typeof Primitive.Backdrop>;
export type DrawerViewportProps = ComponentPropsWithRef<typeof Primitive.Viewport>;
export type DrawerPopupProps = ComponentPropsWithRef<typeof Primitive.Popup>;
export type DrawerBodyProps = ComponentPropsWithRef<typeof Primitive.Content>;
export type DrawerTitleProps = ComponentPropsWithRef<typeof Primitive.Title>;
export type DrawerDescriptionProps = ComponentPropsWithRef<typeof Primitive.Description>;
export type DrawerCloseProps = ComponentPropsWithRef<typeof Primitive.Close>;
export type DrawerContentProps = DrawerPopupProps & {
  portalProps?: DrawerPortalProps;
  overlayProps?: DrawerOverlayProps;
  viewportProps?: DrawerViewportProps;
};
export type DrawerHeaderProps = ComponentPropsWithRef<"div">;
export type DrawerFooterProps = ComponentPropsWithRef<"div">;
export type DrawerHandleProps = ComponentPropsWithRef<"div">;
