import { cn } from "@repo/ui/lib/utils";
import { kbdStyles } from "./Kbd.styles";
import type { KbdGroupProps, KbdProps } from "./Kbd.types";

function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(kbdStyles.kbd(), className)}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: KbdGroupProps) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn(kbdStyles.kbdGroup(), className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
