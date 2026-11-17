import type { sheetSlots } from "./Sheet.styles";
import type { Dialog as Primitive } from "@base-ui/react/dialog";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type SheetProps<Payload = unknown> = Primitive.Root.Props<Payload>;
export type SheetTriggerProps<Payload = unknown> = Primitive.Trigger.Props<Payload>;
export type SheetPortalProps = ComponentPropsWithRef<typeof Primitive.Portal>;
export type SheetOverlayProps = ComponentPropsWithRef<typeof Primitive.Backdrop>;
export type SheetViewportProps = ComponentPropsWithRef<typeof Primitive.Viewport>;
export type SheetPopupVariants = Pick<VariantProps<typeof sheetSlots>, "side">;
export type SheetPopupProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Popup>,
  keyof SheetPopupVariants
> &
  SheetPopupVariants;
export type SheetTitleProps = ComponentPropsWithRef<typeof Primitive.Title>;
export type SheetDescriptionProps = ComponentPropsWithRef<typeof Primitive.Description>;
export type SheetCloseProps = ComponentPropsWithRef<typeof Primitive.Close>;
export type SheetContentProps = SheetPopupProps & {
  portalProps?: SheetPortalProps;
  overlayProps?: SheetOverlayProps;
  viewportProps?: SheetViewportProps;
};
export type SheetHeaderProps = ComponentPropsWithRef<"div">;
export type SheetFooterProps = ComponentPropsWithRef<"div">;
