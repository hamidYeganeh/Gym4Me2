import { cn } from "../../lib/utils";
import { sandowIconVariants } from "./SandowIcon.styles";
import type { SandowIconLayer, SandowIconProps } from "./SandowIcon.types";

/** Named icon components work in server and client components. */
export function createSandowIcon(
  layers: readonly SandowIconLayer[],
  displayName: string,
) {
  function SandowIcon({
    label,
    tone,
    className,
    size,
    style,
    strokeWidth: _strokeWidth,
    fill: _fill,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    ...props
  }: SandowIconProps) {
    void _strokeWidth;
    void _fill;
    void _absoluteStrokeWidth;
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn(sandowIconVariants({ tone }), className)}
        style={{
          ...(size ? { width: size, height: size, fontSize: size } : {}),
          ...style,
        }}
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
