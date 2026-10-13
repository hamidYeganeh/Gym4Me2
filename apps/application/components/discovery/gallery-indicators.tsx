"use client";
import { Button } from "@repo/ui/kit/Button";
import { cn } from "@repo/ui/lib/utils";

export function GalleryIndicators({
  count,
  current,
  onSelect,
  label,
}: {
  count: number;
  current: number;
  onSelect: (index: number) => void;
  label: (index: number) => string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1" role="group">
      {Array.from({ length: count }, (_, index) => (
        <Button
          key={index}
          variant="ghost"
          size="icon-xs"
          className="h-6 w-auto px-1"
          aria-label={label(index)}
          aria-current={index === current ? "true" : undefined}
          onClick={() => onSelect(index)}
        >
          <span
            aria-hidden="true"
            className={cn(
              "block h-1.5 rounded-full transition-[width] motion-reduce:transition-none",
              index === current
                ? "w-8 bg-primary"
                : "w-3 bg-muted-foreground/40",
            )}
          />
        </Button>
      ))}
    </div>
  );
}
