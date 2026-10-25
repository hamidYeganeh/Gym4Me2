"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Flame, Clock, Plus } from "lucide-react";
import { BookmarkIcon } from "../../icons";
import { cn } from "../../lib/utils";
import { Button } from "../Button";
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
}: ClassCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const number = new Intl.NumberFormat(locale);
  const photo = classItem.photo;
  return (
    <article
      data-slot="class-card"
      className={cn(classCardVariants(), className)}
    >
      {href && (
        <Link
          href={href}
          scroll={false}
          className={s.link()}
          aria-label={classItem.title}
        />
      )}
      <div data-slot="class-card-media" className={s.hero()}>
        {photo && photo.src !== failedPhoto && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className={s.image()}
            sizes="(max-width: 384px) 100vw, 384px"
            priority={priority}
            unoptimized
            onError={() => setFailedPhoto(photo.src)}
          />
        )}
        <div className={s.gradient()} />
      </div>
      <div className={s.top()}>
        <Badge variant="outline" className={s.level()}>
          {classItem.level}
        </Badge>
        <p className={s.duration()}>
          <Clock aria-hidden="true" />
          <span>
            {number.format(classItem.minutes)} {labels.minutes}
          </span>
        </p>
      </div>
      <div data-slot="class-card-content" className={s.content()}>
        <div className={s.details()}>
          <dl className={s.metrics()}>
            {[
              {
                Icon: Flame,
                value: number.format(classItem.calories),
                label: labels.calories,
              },
              {
                Icon: Plus,
                value: new Intl.NumberFormat(locale, {
                  signDisplay: "always",
                }).format(classItem.score),
                label: labels.score,
              },
            ].map(({ Icon, value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className={s.value()}>
                  <Icon aria-hidden="true" />
                  <bdi>{value}</bdi>
                </dd>
              </div>
            ))}
          </dl>
          <h2 className={s.title()}>{classItem.title}</h2>
          <p className={s.coach()}>{classItem.coachName}</p>
        </div>
        <div className={s.actions()}>
          {onSavedChange && (
            <Button
              type="button"
              variant="image"
              size="icon-lg"
              className={s.save()}
              aria-label={saved ? labels.unsave : labels.save}
              aria-pressed={saved}
              onClick={() => onSavedChange(!saved)}
            >
              <BookmarkIcon aria-hidden="true" />
            </Button>
          )}
          <span aria-hidden="true" className={s.arrow()}>
            <ArrowUpRight className="[&:dir(rtl)]:-rotate-90" />
          </span>
        </div>
      </div>
    </article>
  );
}
