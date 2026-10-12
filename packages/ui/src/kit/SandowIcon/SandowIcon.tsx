import { cn } from "../../lib/utils";
import { sandowIconVariants } from "./SandowIcon.styles";
import type { SandowIconLayer, SandowIconProps } from "./SandowIcon.types";

/** Named icon components work in server and client components. */
export function createSandowIcon(
  layers: readonly SandowIconLayer[],
  displayName: string,
) {
  function SandowIcon({ label, tone, className, ...props }: SandowIconProps) {
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn(sandowIconVariants({ tone }), className)}
        {...props}
      >
        {layers.map(([codepoint, opacity]) => (
          <span key={codepoint} aria-hidden="true" style={{ opacity }}>
            {String.fromCodePoint(codepoint)}
          </span>
        ))}
      </span>
    );
  }
  SandowIcon.displayName = displayName;
  return SandowIcon;
}
