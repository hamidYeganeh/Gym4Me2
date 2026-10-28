"use client";
import { useTranslations } from "@repo/i18n";
import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import {
  ChevronRightIcon,
  DotThreeHorizontalIcon as MoreHorizontalIcon,
} from "../../icons";
import { breadcrumbStyles } from "./Breadcrumb.styles";
import type {
  BreadcrumbEllipsisProps,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbListProps,
  BreadcrumbPageProps,
  BreadcrumbProps,
  BreadcrumbSeparatorProps,
} from "./Breadcrumb.types";

function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  const t = useTranslations();
  return (
    <nav
      aria-label={t("Kit.breadcrumb")}
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(breadcrumbStyles.breadcrumbList(), className)}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(breadcrumbStyles.breadcrumbItem(), className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(breadcrumbStyles.breadcrumbLink(), className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn(breadcrumbStyles.breadcrumbPage(), className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn(breadcrumbStyles.breadcrumbSeparator(), className)}
      {...props}
    >
      {children ?? (
        <ChevronRightIcon className={breadcrumbStyles.breadcrumbSeparator2()} />
      )}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: BreadcrumbEllipsisProps) {
  const t = useTranslations();
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn(breadcrumbStyles.breadcrumbEllipsis(), className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className={breadcrumbStyles.breadcrumbEllipsis2()}>
        {t("Kit.more")}
      </span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
