"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
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
import { Search } from "../Search";
import { CheckIcon } from "../../icons";

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
  title,
  description,
  children,
  className,
  showCloseButton = false,
  ...props
}: CommandDialogProps) {
  const t = useTranslations();
  description ??= t("Kit.commandDescription");
  title ??= t("Kit.commandPalette");
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
  const [value, setValue] = useState(String(props.defaultValue ?? ""));
  return (
    <div
      data-slot="command-input-wrapper"
      className={commandStyles.commandInput()}
    >
      <Search
        value={props.value ?? value}
        placeholder={props.placeholder}
        aria-label={props["aria-label"] ?? props.placeholder}
        render={<CommandPrimitive.Input data-slot="command-input" {...props} onValueChange={(next) => { setValue(next); props.onValueChange?.(next); }} />}
        className={className}
      />
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
