import { Star } from "lucide-react";
import { reviewsSummaryStyles as s } from "./ReviewsSummary.styles";
import type { ReviewsSummaryProps } from "./ReviewsSummary.types";
export function ReviewsSummary({
  counts,
  locale = "en",
  labels,
}: ReviewsSummaryProps) {
  const levels = [5, 4, 3, 2, 1] as const;
  const total = levels.reduce((sum, level) => sum + counts[level], 0);
  const average = total
    ? levels.reduce((sum, level) => sum + level * counts[level], 0) / total
    : 0;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <div className={s.root()}>
      <div className={s.average()}>
        <strong className={s.value()}>{number.format(average)}</strong>
        <span className="text-sm font-semibold">{labels.average}</span>
        <span className="text-xs text-muted-foreground">
          {labels.users(total)}
        </span>
      </div>
      <dl className={s.bars()}>
        {levels.map((level) => (
          <div className={s.row()} key={level}>
            <dt className="flex shrink-0 items-center gap-1 font-bold">
              <span>{number.format(level)}</span>
              <Star
                aria-hidden="true"
                className="size-4 text-rating"
                fill="currentColor"
              />
              <span className="sr-only">{labels.rating}</span>
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2">
              <span className={s.track()} aria-hidden="true">
                <span
                  className={s.fill()}
                  style={{
                    display: "block",
                    width: `${total ? (counts[level] / total) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-8 text-end text-muted-foreground">
                {number.format(counts[level])}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
