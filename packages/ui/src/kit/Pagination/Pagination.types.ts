import { Button } from "@repo/ui/kit/Button";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { PaginationLink } from "./Pagination";
import type { paginationVariants } from "./Pagination.styles";
import type { RootProps } from "@animate-ui/react/primitives/pagination";
export type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

export type PaginationProps = RootProps;

export type PaginationContentProps = React.ComponentProps<"ul">;

export type PaginationItemProps = React.ComponentProps<"li">;

export type PaginationPreviousProps = React.ComponentProps<
  typeof PaginationLink
> & { text?: string };

export type PaginationNextProps = React.ComponentProps<
  typeof PaginationLink
> & { text?: string };

export type PaginationEllipsisProps = React.ComponentProps<"span">;

export type PaginationVariants = VariantProps<typeof paginationVariants>;
