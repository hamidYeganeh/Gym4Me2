"use client";
import { resizableStyles } from "./Resizable.styles";
import type {
  ResizableHandleProps,
  ResizablePanelGroupProps,
  ResizablePanelProps,
} from "./Resizable.types";

import { cn } from "@repo/ui/lib/utils";
import * as ResizablePrimitive from "react-resizable-panels";

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(resizableStyles.resizablePanelGroup(), className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(resizableStyles.resizableHandle(), className)}
      {...props}
    >
      {withHandle && <div className={resizableStyles.resizableHandle2()} />}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
