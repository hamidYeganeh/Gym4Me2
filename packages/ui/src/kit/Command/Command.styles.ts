import { cva } from "class-variance-authority";
export const commandVariants = cva("");

export const commandStyles = {
  command: cva(
    "flex size-full flex-col overflow-hidden rounded-4xl bg-popover p-1 text-popover-foreground",
  ),
  commandDialog: cva("sr-only"),
  commandDialog2: cva("top-1/3 translate-y-0 overflow-hidden rounded-4xl! p-0"),
  commandInput: cva("p-1 pb-0"),
  commandInput2: cva("h-9 bg-input/50"),
  commandInput3: cva(
    "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
  ),
  commandInput4: cva("size-4 shrink-0 opacity-50"),
  commandList: cva(
    "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
  ),
  commandEmpty: cva("py-6 text-center text-sm"),
  commandGroup: cva(
    "overflow-hidden p-1.5 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
  ),
  commandSeparator: cva("my-1.5 h-px bg-border/50"),
  commandItem: cva(
    "group/command-item relative flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none in-data-[slot=dialog-content]:rounded-3xl data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_:is(svg,.sandow-icon)]:pointer-events-none [&_:is(svg,.sandow-icon)]:shrink-0 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
  ),
  commandItem2: cva(
    "ms-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100",
  ),
  commandShortcut: cva(
    "ms-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
  ),
};
