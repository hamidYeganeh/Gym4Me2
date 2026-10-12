"use client";
import { Star, MoreVertical, ThumbsUp, ThumbsDown } from "lucide-react";
import { SealCheckIcon } from "../../icons";
import { cn } from "../../lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "../Avatar";
import { Button } from "../Button";
import { reviewCardVariants, reviewCardStyles as s } from "./ReviewCard.styles";
import type { ReviewCardProps } from "./ReviewCard.types";

export function ReviewCard({
  review,
  labels,
  locale = "en",
  vote = null,
  onVoteChange,
  onReport,
  onMore,
  className,
}: ReviewCardProps) {
  const rating = Math.min(
    5,
    Math.max(0, Number.isFinite(review.rating) ? review.rating : 0),
  );
  const parsedDate = new Date(review.date);
  const date = Number.isNaN(parsedDate.getTime())
    ? review.date
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(parsedDate);
  return (
    <article
      data-slot="review-card"
      className={cn(reviewCardVariants(), className)}
    >
      <div className={s.header()}>
        {review.author && (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-11 shrink-0">
              {review.author.avatarUrl && (
                <AvatarImage src={review.author.avatarUrl} alt="" />
              )}
              <AvatarFallback>
                {review.author.displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join(" ")}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 text-base font-semibold">
              {review.author.displayName}
            </p>
          </div>
        )}
        <time
          dateTime={
            Number.isNaN(parsedDate.getTime())
              ? undefined
              : parsedDate.toISOString()
          }
          className={s.date()}
        >
          {date}
        </time>
        {onMore && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={labels.more}
            onClick={onMore}
          >
            <MoreVertical />
          </Button>
        )}
      </div>
      <h3 className={s.title()}>{review.title}</h3>
      <p className={s.body()}>{review.body}</p>
      <div className={s.rating()}>
        <span aria-hidden="true" dir="ltr" className={s.stars()}>
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={s.star()}>
              <Star />
              <span
                className={s.fill()}
                style={{
                  width: `${Math.min(1, Math.max(0, rating - index)) * 100}%`,
                }}
              >
                <Star fill="currentColor" />
              </span>
            </span>
          ))}
        </span>
        <span className="sr-only">{labels.rating}: </span>
        <span className="sr-only">
          {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
            rating,
          )}
        </span>
      </div>
      {review.verified && (
        <p className={s.verified()}>
          <SealCheckIcon />
          {labels.verified}
        </p>
      )}
      {(onVoteChange || onReport) && (
        <div className={s.actions()}>
          {onVoteChange && (
            <>
              <Button
                variant={vote === "like" ? "secondary" : "ghost"}
                aria-pressed={vote === "like"}
                onClick={() => onVoteChange(vote === "like" ? null : "like")}
              >
                <ThumbsUp data-icon="inline-start" />
                {labels.like}
              </Button>
              <Button
                variant={vote === "dislike" ? "secondary" : "ghost"}
                aria-pressed={vote === "dislike"}
                onClick={() =>
                  onVoteChange(vote === "dislike" ? null : "dislike")
                }
              >
                <ThumbsDown data-icon="inline-start" />
                {labels.dislike}
              </Button>
            </>
          )}
          {onReport && (
            <Button variant="ghost" className="ms-auto" onClick={onReport}>
              {labels.report}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
