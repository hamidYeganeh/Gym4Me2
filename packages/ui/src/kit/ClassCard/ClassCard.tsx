"use client";
import { Like } from "@repo/ui/kit/Like";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRightIcon as ArrowUpRight,
  ClockIcon as Clock,
  BarbellHorizontalIcon as Dumbbell,
} from "../../icons";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar";
import { Badge } from "../Badge";
import { classCardVariants, classCardStyles as s } from "./ClassCard.styles";
import type { ClassCardProps } from "./ClassCard.types";

export function ClassCard({
  classItem,
  labels,
  locale = "en",
  href,
  saved = false,
  onSavedChange,
  className,
  priority = false,
  compact = false,
}: ClassCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const number = new Intl.NumberFormat(locale);
  const photo = classItem.photo;
  if (compact)
    return (
      <article
        data-slot="class-card"
        data-zoom-exit-key={`class-${classItem.id}`}
        data-layout="compact"
        className={cn(
          "relative flex w-full flex-col gap-4 rounded-3xl border border-border bg-card p-4 text-card-foreground",
          className,
        )}
      >
        {href && (
          <Link
            href={href}
            scroll={false}
            className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={classItem.title}
          />
        )}
        <div className="flex items-start gap-4">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
            {photo && photo.src !== failedPhoto ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
                onError={() => setFailedPhoto(photo.src)}
              />
            ) : (
              <Dumbbell size={36} className="text-primary" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-lg font-semibold leading-7">
              {classItem.title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {classItem.coachName}
            </p>
            <div className="flex flex-wrap gap-2">
              {classItem.level && (
                <Badge variant="secondary">{classItem.level}</Badge>
              )}
              {classItem.minutes !== undefined && (
                <Badge variant="secondary">
                  <Clock />
                  {number.format(classItem.minutes)} {labels.minutes}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{classItem.priceLabel}</p>
          <ArrowUpRight
            aria-hidden="true"
            className="text-muted-foreground rtl:-rotate-90"
          />
        </div>
      </article>
    );
  return (
    <article
      data-slot="class-card"
      data-zoom-exit-key={`class-${classItem.id}`}
      className={cn(
        classCardVariants(),
        (!photo || photo.src === failedPhoto) &&
          "[--image-surface:var(--card)] [--image-foreground:var(--card-foreground)]",
        className,
      )}
    >
      {href && (
        <Link
          href={href}
          scroll={false}
          className={s.link()}
          aria-label={classItem.title}
        />
      )}
      <div className={s.hero()}>
        {photo && photo.src !== failedPhoto ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className="object-cover grayscale"
            sizes="(max-width:576px) 100vw, 536px"
            priority={priority}
            unoptimized
            onError={() => setFailedPhoto(photo.src)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center bg-image-surface"
          >
            <Dumbbell
              size={96}
              className="text-image-foreground/15"
              strokeWidth={1}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-image-surface via-image-surface/45 to-transparent" />
      </div>
      <div className="relative z-20 flex items-start justify-between gap-3 p-5">
        {classItem.level ? (
          <Badge variant="contrast">{classItem.level}</Badge>
        ) : (
          <span />
        )}
        {onSavedChange ? (
          <Like
            variant="image"
            size="icon-lg"
            aria-label={saved ? labels.unsave : labels.save}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
          ></Like>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none grid size-12 place-items-center rounded-full border border-image-foreground/30 bg-image-surface/70"
          >
            <ArrowUpRight className="rtl:-rotate-90" />
          </span>
        )}
      </div>
      <div className="pointer-events-none relative z-20 mt-auto flex flex-col gap-3 p-5">
        <h2 className="text-2xl font-bold leading-snug">{classItem.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-image-foreground/80">
          {classItem.minutes !== undefined && (
            <span>
              {number.format(classItem.minutes)} {labels.minutes}
            </span>
          )}
          {classItem.minutes !== undefined && classItem.priceLabel && (
            <span aria-hidden="true">•</span>
          )}
          {classItem.priceLabel && <span>{classItem.priceLabel}</span>}
        </div>
        {classItem.coachName && (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={classItem.coachPhoto?.src} alt="" />
              <AvatarFallback>{classItem.coachName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <p className="text-base leading-6">{classItem.coachName}</p>
          </div>
        )}
      </div>
    </article>
  );
}
