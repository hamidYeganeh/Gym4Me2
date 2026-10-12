import { cn } from "@repo/ui/lib/utils";
import { paginationStyles } from "./Pagination.styles";
import type {
  PaginationContentProps,
  PaginationEllipsisProps,
  PaginationItemProps,
  PaginationLinkProps,
  PaginationNextProps,
  PaginationPreviousProps,
  PaginationProps,
} from "./Pagination.types";

import { Button } from "@repo/ui/kit/Button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn(paginationStyles.pagination(), className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: PaginationContentProps) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn(paginationStyles.paginationContent(), className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: PaginationItemProps) {
  return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      asChild
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
    >
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: PaginationPreviousProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn(paginationStyles.paginationPrevious(), className)}
      {...props}
    >
      <ChevronLeftIcon
        data-icon="inline-start"
        className={paginationStyles.paginationPrevious2()}
      />
      <span className={paginationStyles.paginationPrevious3()}>{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: PaginationNextProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn(paginationStyles.paginationNext(), className)}
      {...props}
    >
      <span className={paginationStyles.paginationNext2()}>{text}</span>
      <ChevronRightIcon
        data-icon="inline-end"
        className={paginationStyles.paginationNext3()}
      />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: PaginationEllipsisProps) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(paginationStyles.paginationEllipsis(), className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className={paginationStyles.paginationEllipsis2()}>More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
