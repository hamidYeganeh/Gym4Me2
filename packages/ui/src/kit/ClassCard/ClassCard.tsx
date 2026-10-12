"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Clock, Plus } from "lucide-react";
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
      <div className={s.hero()}>
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
        <div className={s.top()}>
          <Badge variant="secondary">{classItem.level}</Badge>
          {onSavedChange && (
            <Button
              variant="image"
              size="icon-lg"
              aria-label={saved ? labels.unsave : labels.save}
              aria-pressed={saved}
              onClick={() => onSavedChange(!saved)}
            >
              <BookmarkIcon />
            </Button>
          )}
        </div>
      </div>
      <div className={s.content()}>
        <h2 className={s.title()}>{classItem.title}</h2>
        <p className={s.coach()}>{classItem.coachName}</p>
        <dl className={s.metrics()}>
          {[
            {
              Icon: Flame,
              value: number.format(classItem.calories),
              label: labels.calories,
              color: s.energy(),
            },
            {
              Icon: Clock,
              value: number.format(classItem.minutes),
              label: labels.minutes,
              color: "",
            },
            {
              Icon: Plus,
              value: new Intl.NumberFormat(locale, {
                signDisplay: "always",
              }).format(classItem.score),
              label: labels.score,
              color: s.score(),
            },
          ].map(({ Icon, value, label, color }) => (
            <div key={label}>
              <dd className={s.value()}>
                <Icon aria-hidden="true" className={color} />
                {value}
              </dd>
              <dt className={s.label()}>{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
