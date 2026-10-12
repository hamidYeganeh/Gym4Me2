"use client";
import { commandStyles } from "./Command.styles";
import type {
  CommandDialogProps,
  CommandEmptyProps,
  CommandGroupProps,
  CommandInputProps,
  CommandItemProps,
  CommandListProps,
  CommandProps,
  CommandSeparatorProps,
  CommandShortcutProps,
} from "./Command.types";

import { cn } from "@repo/ui/lib/utils";
import { Command as CommandPrimitive } from "cmdk";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/kit/Dialog";
import { InputGroup, InputGroupAddon } from "@repo/ui/kit/InputGroup";
import { CheckIcon, SearchIcon } from "lucide-react";

function Command({ className, ...props }: CommandProps) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(commandStyles.command(), className)}
      {...props}
    />
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogHeader className={commandStyles.commandDialog()}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(commandStyles.commandDialog2(), className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({ className, ...props }: CommandInputProps) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={commandStyles.commandInput()}
    >
      <InputGroup className={commandStyles.commandInput2()}>
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(commandStyles.commandInput3(), className)}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className={commandStyles.commandInput4()} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function CommandList({ className, ...props }: CommandListProps) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(commandStyles.commandList(), className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: CommandEmptyProps) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(commandStyles.commandEmpty(), className)}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: CommandGroupProps) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(commandStyles.commandGroup(), className)}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: CommandSeparatorProps) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn(commandStyles.commandSeparator(), className)}
      {...props}
    />
  );
}

function CommandItem({ className, children, ...props }: CommandItemProps) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(commandStyles.commandItem(), className)}
      {...props}
    >
      {children}
      <CheckIcon className={commandStyles.commandItem2()} />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({ className, ...props }: CommandShortcutProps) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(commandStyles.commandShortcut(), className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
