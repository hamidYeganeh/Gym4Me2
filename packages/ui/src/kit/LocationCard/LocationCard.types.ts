import type { ComponentProps } from "react";

export type LocationCardProps = {
  name: string;
  parent?: string;
  cover?: { src: string; alt: string };
  clubs?: { id: string; name: string; image: string }[];
  clubCount?: number;
  kindLabel?: string;
  tone?: "sky" | "green" | "amber";
  className?: string;
  selected?: boolean;
  active?: boolean;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  saveLabel?: string;
  selectionProps?: Omit<
    ComponentProps<"button">,
    "children" | "onClick" | "className"
  >;
  href?: string;
  onSelect?: () => void;
};
