import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { breadcrumbVariants } from "./Breadcrumb.styles";
export type BreadcrumbProps = React.ComponentProps<"nav">;

export type BreadcrumbListProps = React.ComponentProps<"ol">;

export type BreadcrumbItemProps = React.ComponentProps<"li">;

export type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
  asChild?: boolean;
};

export type BreadcrumbPageProps = React.ComponentProps<"span">;

export type BreadcrumbSeparatorProps = React.ComponentProps<"li">;

export type BreadcrumbEllipsisProps = React.ComponentProps<"span">;

export type BreadcrumbVariants = VariantProps<typeof breadcrumbVariants>;
