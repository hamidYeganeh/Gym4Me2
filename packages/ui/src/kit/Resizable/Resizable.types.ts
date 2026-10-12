import type { VariantProps } from "class-variance-authority";
import * as ResizablePrimitive from "react-resizable-panels";
import type { resizableVariants } from "./Resizable.styles";
export type ResizablePanelGroupProps = ResizablePrimitive.GroupProps;

export type ResizablePanelProps = ResizablePrimitive.PanelProps;

export type ResizableHandleProps = ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
};

export type ResizableVariants = VariantProps<typeof resizableVariants>;
