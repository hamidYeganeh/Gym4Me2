import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/utils";

// Legacy kinds stay compatible with existing callers; shared empty states now
// use isolated club or coaching artwork with a genuinely transparent backdrop.
export type FitnessIllustrationKind =
  | "bottle"
  | "kettlebell"
  | "punchingBag"
  | "treadmill"
  | "handGrip"
  | "watch"
  | "jumpRope"
  | "club"
  | "coach";

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
    backgroundImage: `url("/images/fitness/${kind === "coach" ? "coach" : "club"}-empty.png")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    backgroundPosition: "center",
  };
  return (
    <div
      data-slot="fitness-illustration"
      data-kind={kind}
      aria-hidden="true"
      style={style}
      className={cn(
        "pointer-events-none aspect-square shrink-0 overflow-hidden rounded-3xl bg-transparent",
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
