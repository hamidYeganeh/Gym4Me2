import { cn } from "@repo/ui/lib/utils";
import { emptyMediaVariants, emptyStyles } from "./Empty.styles";
import type {
  EmptyContentProps,
  EmptyDescriptionProps,
  EmptyHeaderProps,
  EmptyMediaProps,
  EmptyProps,
  EmptyTitleProps,
} from "./Empty.types";

function Empty({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(emptyStyles.empty(), className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: EmptyHeaderProps) {
  return (
    <div
      data-slot="empty-header"
      className={cn(emptyStyles.emptyHeader(), className)}
      {...props}
    />
  );
}

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: EmptyTitleProps) {
  return (
    <div
      data-slot="empty-title"
      className={cn(emptyStyles.emptyTitle(), className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: EmptyDescriptionProps) {
  return (
    <div
      data-slot="empty-description"
      className={cn(emptyStyles.emptyDescription(), className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: EmptyContentProps) {
  return (
    <div
      data-slot="empty-content"
      className={cn(emptyStyles.emptyContent(), className)}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
};
