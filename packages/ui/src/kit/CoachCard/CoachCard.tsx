"use client";
import { useTranslations } from "@repo/i18n";
import { Like } from "@repo/ui/kit/Like";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRightIcon as ArrowUpRight,
  Calendar1Icon,
  SealCheckIcon,
  StarFullIcon as Star,
} from "../../icons";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../Avatar";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { SocialIcon } from "../SocialIcon";
import { coachCardVariants, coachCardStyles as s } from "./CoachCard.styles";
import type { CoachCardProps } from "./CoachCard.types";

export function CoachCard({
  coach,
  labels,
  locale = "en",
  href,
  saved = false,
  onSavedChange,
  className,
  priority = false,
  variant = "default",
  compact = false,
  badgeLabel,
}: CoachCardProps) {
  const t = useTranslations("Kit");
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const rating = Math.min(
    5,
    Math.max(
      0,
      typeof coach.rating === "number" && Number.isFinite(coach.rating)
        ? coach.rating
        : 0,
    ),
  );
  const photo = coach.photo;
  const socialLinks = (coach.socialLinks ?? []).filter((link) => {
    try {
      return ["https:", "http:"].includes(new URL(link.href).protocol);
    } catch {
      return false;
    }
  });
  const socialNames = {
    facebook: t("facebook"),
    instagram: t("instagram"),
    linkedin: t("linkedin"),
  };
  if (compact)
    return (
      <article
        data-slot="coach-card"
        data-zoom-exit-key={`coach-${coach.id}`}
        data-layout="compact"
        className={cn(
          "relative flex w-full items-start gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground",
          className,
        )}
      >
        {href && (
          <Link
            href={href}
            scroll={false}
            className="absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={coach.name}
          />
        )}
        <Avatar className="size-20 shrink-0">
          <AvatarImage src={photo?.src} alt="" />
          <AvatarFallback>{coach.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-lg font-semibold leading-7">{coach.name}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {coach.specialty}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar1Icon />
            {number.format(coach.yearsOfExperience)} {labels.experience}
          </p>
        </div>
        <div className="relative flex shrink-0 flex-col gap-3">
          {onSavedChange && (
            <Like
              variant="ghost"
              size="icon"
              aria-label={saved ? labels.unsave : labels.save}
              aria-pressed={saved}
              onClick={() => onSavedChange(!saved)}
            ></Like>
          )}
          <ArrowUpRight
            aria-hidden="true"
            className="pointer-events-none mx-auto text-muted-foreground rtl:-rotate-90"
          />
        </div>
      </article>
    );
  return (
    <article
      data-slot="coach-card"
      data-zoom-exit-key={`coach-${coach.id}`}
      data-variant={variant}
      className={cn(coachCardVariants({ variant }), className)}
    >
      {photo && photo.src !== failedPhoto && (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 384px) 100vw, 384px"
          className={s.image({ variant })}
          priority={priority}
          unoptimized
          onError={() => setFailedPhoto(photo.src)}
        />
      )}
      {(!photo || photo.src === failedPhoto) && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[22%] flex justify-center"
        >
          <Avatar className="size-28">
            <AvatarFallback>{coach.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div aria-hidden="true" className={s.gradient({ variant })} />
      {href && (
        <Link
          href={href}
          scroll={false}
          className={s.link()}
          aria-label={`${coach.name} · ${coach.specialty}`}
        />
      )}
      <div className={variant === "portrait" ? s.portraitTop() : s.top()}>
        {variant === "portrait" &&
          (socialLinks.length ? (
            <div className={s.socialBar()}>
              {socialLinks.map((link) => (
                <Button
                  key={link.platform}
                  asChild
                  variant="ghost"
                  size="icon-lg"
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label ?? socialNames[link.platform]} · ${coach.name}`}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                </Button>
              ))}
            </div>
          ) : (
            <span />
          ))}
        {variant !== "portrait" &&
          (badgeLabel || coach.isNew ? (
            <Badge variant="contrast">{badgeLabel ?? labels.new}</Badge>
          ) : (
            <span />
          ))}
        {onSavedChange && (
          <Like
            variant="image"
            size="icon-lg"
            aria-label={saved ? labels.unsave : labels.save}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
          ></Like>
        )}
      </div>
      <div className={s.content({ variant })}>
        <h2 className={s.title({ variant })}>{coach.name}</h2>
        <p className={s.specialty({ variant })}>{coach.specialty}</p>
        {variant !== "portrait" && (
          <>
            {coach.rating !== undefined && (
              <div className={s.rating()}>
                <span aria-hidden="true" className={s.stars()} dir="ltr">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} className={s.star()}>
                      <Star />
                      <span
                        className={s.starFill()}
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
                <strong>{number.format(rating)}</strong>
                <span>({number.format(coach.reviews ?? 0)})</span>
              </div>
            )}
            <div className={s.meta()}>
              {coach.certified && (
                <>
                  <span className={s.certification()}>
                    <SealCheckIcon className={s.certifiedIcon()} />
                    <span>{labels.certified}</span>
                  </span>
                  <span aria-hidden="true" className={s.separator()}>
                    •
                  </span>
                </>
              )}
              {coach.yearsOfExperience > 0 && <span className={s.experience()}>
                <Calendar1Icon />
                <span>
                  {number.format(coach.yearsOfExperience)} {labels.experience}
                </span>
              </span>}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
