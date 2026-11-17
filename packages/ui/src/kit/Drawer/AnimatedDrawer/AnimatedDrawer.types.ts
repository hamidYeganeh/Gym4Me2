import type { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";
import type { ComponentPropsWithRef } from "react";

export type AnimatedDrawerProps<Payload = unknown> = Primitive.Root.Props<Payload>;
export type AnimatedDrawerTriggerProps<Payload = unknown> = Primitive.Trigger.Props<Payload>;
export type AnimatedDrawerPortalProps = ComponentPropsWithRef<typeof Primitive.Portal>;
export type AnimatedDrawerOverlayProps = ComponentPropsWithRef<typeof Primitive.Backdrop>;
export type AnimatedDrawerViewportProps = ComponentPropsWithRef<typeof Primitive.Viewport>;
export type AnimatedDrawerPopupProps = ComponentPropsWithRef<typeof Primitive.Popup>;
export type AnimatedDrawerBodyProps = ComponentPropsWithRef<typeof Primitive.Content>;
export type AnimatedDrawerTitleProps = ComponentPropsWithRef<typeof Primitive.Title>;
export type AnimatedDrawerDescriptionProps = ComponentPropsWithRef<typeof Primitive.Description>;
export type AnimatedDrawerCloseProps = ComponentPropsWithRef<typeof Primitive.Close>;
export type AnimatedDrawerContentProps = AnimatedDrawerPopupProps & {
  portalProps?: AnimatedDrawerPortalProps;
  overlayProps?: AnimatedDrawerOverlayProps;
  viewportProps?: AnimatedDrawerViewportProps;
};
export type AnimatedDrawerHeaderProps = ComponentPropsWithRef<"div">;
export type AnimatedDrawerFooterProps = ComponentPropsWithRef<"div">;
export type AnimatedDrawerHandleProps = ComponentPropsWithRef<"div">;
