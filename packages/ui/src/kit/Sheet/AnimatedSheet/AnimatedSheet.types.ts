import type { sheetSlots } from "./AnimatedSheet.styles";
import type { Dialog as Primitive } from "@animate-ui/react/primitives/base-ui/dialog";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type AnimatedSheetProps<Payload = unknown> = Primitive.Root.Props<Payload>;
export type AnimatedSheetTriggerProps<Payload = unknown> = Primitive.Trigger.Props<Payload>;
export type AnimatedSheetPortalProps = ComponentPropsWithRef<typeof Primitive.Portal>;
export type AnimatedSheetOverlayProps = ComponentPropsWithRef<typeof Primitive.Backdrop>;
export type AnimatedSheetViewportProps = ComponentPropsWithRef<typeof Primitive.Viewport>;
export type AnimatedSheetPopupVariants = Pick<VariantProps<typeof sheetSlots>, "side">;
export type AnimatedSheetPopupProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Popup>,
  keyof AnimatedSheetPopupVariants
> &
  AnimatedSheetPopupVariants;
export type AnimatedSheetTitleProps = ComponentPropsWithRef<typeof Primitive.Title>;
export type AnimatedSheetDescriptionProps = ComponentPropsWithRef<typeof Primitive.Description>;
export type AnimatedSheetCloseProps = ComponentPropsWithRef<typeof Primitive.Close>;
export type AnimatedSheetContentProps = AnimatedSheetPopupProps & {
  portalProps?: AnimatedSheetPortalProps;
  overlayProps?: AnimatedSheetOverlayProps;
  viewportProps?: AnimatedSheetViewportProps;
};
export type AnimatedSheetHeaderProps = ComponentPropsWithRef<"div">;
export type AnimatedSheetFooterProps = ComponentPropsWithRef<"div">;
