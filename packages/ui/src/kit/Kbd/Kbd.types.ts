import type { VariantProps } from "class-variance-authority";
import type { kbdVariants } from "./Kbd.styles";
export type KbdProps = React.ComponentProps<"kbd">;

export type KbdGroupProps = React.ComponentProps<"div">;

export type KbdVariants = VariantProps<typeof kbdVariants>;
