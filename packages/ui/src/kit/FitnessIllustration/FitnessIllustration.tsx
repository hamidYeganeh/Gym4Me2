import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/utils";

// Viewports into the original, unmodified 2112 × 5000 illustration sheet.
// Each complete object comes from the middle column; the partial last row is unused.
const rows = {
  bottle: 70,
  kettlebell: 758,
  punchingBag: 1447,
  treadmill: 2133,
  handGrip: 2822,
  watch: 3508,
  jumpRope: 4194,
} as const;

export type FitnessIllustrationKind = keyof typeof rows;

export function FitnessIllustration({
  kind,
  size = "lg",
  className,
}: {
  kind: FitnessIllustrationKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const style: CSSProperties = {
    backgroundImage: 'url("/images/fitness/fitness-objects.png")',
    backgroundRepeat: "no-repeat",
    backgroundSize: `${(2112 / 550) * 100}% ${(5000 / 550) * 100}%`,
    backgroundPosition: `${(806 / (2112 - 550)) * 100}% ${(rows[kind] / (5000 - 550)) * 100}%`,
  };
  return (
    <div
      data-slot="fitness-illustration"
      data-kind={kind}
      aria-hidden="true"
      style={style}
      className={cn(
        "pointer-events-none aspect-square shrink-0 overflow-hidden rounded-3xl bg-image-surface",
        size === "sm"
          ? "size-16 rounded-2xl"
          : size === "md"
            ? "size-20 sm:size-28"
            : "size-32 sm:size-36",
        className,
      )}
    />
  );
}

/** A supporting note or banner with a real, caller-provided action. */
export function FitnessNote({
  title,
  description,
  action,
  illustration = "bottle",
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: FitnessIllustrationKind;
  className?: string;
}) {
  return (
    <aside
      data-slot="fitness-note"
      className={cn(
        "flex items-center gap-4 rounded-3xl border bg-muted/40 p-5 sm:gap-6 sm:p-6",
        className,
      )}
    >
      <FitnessIllustration kind={illustration} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </aside>
  );
}
