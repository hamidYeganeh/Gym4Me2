"use client";

import { useClubPhoto } from "../../hooks/use-club-photo";
import { useTranslations } from "@repo/i18n";
import Image from "next/image";
import Link from "next/link";
import {
  BookmarkIcon,
  StarFullIcon,
  MapPin1Icon,
  BarbellHorizontalIcon,
  UsersThreeIcon,
  Ruler1Icon,
} from "../../icons";
import { cn } from "../../lib/utils";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { NotebookPen } from "lucide-react";
import { clubCardStyles as s } from "./ClubCard.styles";
import type { ClubCardProps } from "./ClubCard.types";

export function ClubCard({
  club,
  saved = false,
  onSavedChange,
  labels,
  size,
  variant = "portrait",
  featuredLabel,
  className,
  priority = false,
  galleryLabel,
  photoLabel,
}: ClubCardProps) {
  const [photoIndex, setPhotoIndex] = useClubPhoto(club.id);
  const t = useTranslations("Clubs");
  const photo = club.photos[photoIndex] ?? club.photos[0];
  const href = club.href ?? `/discovery/clubs/${encodeURIComponent(club.id)}`;
  const icons = [BarbellHorizontalIcon, UsersThreeIcon, Ruler1Icon];
  return (
    <article
      data-slot="club-card"
      data-variant={variant}
      className={cn(s.root({ size, variant }), className)}
    >
      <div
        className={cn(
          s.cover({ size, variant }),
          variant === "landscape" && "size-20 shrink-0 aspect-square",
        )}
        data-zoom-exit-key={`club-${club.id}`}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 380px"
          className={s.image()}
          priority={priority}
          unoptimized
        />
      </div>
      {variant === "portrait" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-image-surface/95 via-image-surface/20 to-image-surface/10"
        />
      )}
      <Link
        href={href}
        scroll={false}
        className={s.link()}
        aria-label={`${labels.discover} · ${club.name}`}
      />
      <div
        className={cn(s.top({ variant }), variant === "landscape" && "hidden")}
      >
        {variant === "landscape" ? (
          featuredLabel ? (
            <Badge>{featuredLabel}</Badge>
          ) : (
            <span />
          )
        ) : (
          <p className={s.price()}>
            {club.price}
            {club.pricePeriod && (
              <span className={s.muted()}> / {club.pricePeriod}</span>
            )}
          </p>
        )}
        {onSavedChange && (
          <Button
            className="pointer-events-auto"
            size="icon-lg"
            variant="image"
            type="button"
            aria-label={saved ? labels.unsave : labels.save}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
          >
            <BookmarkIcon />
          </Button>
        )}
      </div>
      {variant === "landscape" ? (
        <div className={s.landscapeContent()}>
          <div className={s.titleRow()}>
            <div className="min-w-0">
              <h2 className={s.landscapeTitle()}>{club.name}</h2>
              <p className={s.landscapeAddress()}>{club.address}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {club.price}
            {club.pricePeriod && ` / ${club.pricePeriod}`}
          </p>
          {onSavedChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="pointer-events-auto absolute end-0 bottom-0"
              aria-label={saved ? labels.unsave : labels.save}
              aria-pressed={saved}
              onClick={() => onSavedChange(!saved)}
            >
              <BookmarkIcon />
            </Button>
          )}
          <ul className={s.facilities()}>
            {club.facilities.map((item, index) => {
              if (!item.trim()) return null;
              const Icon = icons[index % icons.length]!;
              return (
                <li key={`${index}-${item}`} className={s.facility()}>
                  <Icon />
                  {item}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className={s.content()}>
          {club.photos.length > 1 && (
            <div
              className="pointer-events-auto mx-auto flex rounded-full border border-image-foreground/30 bg-image-surface/40 p-0.5 backdrop-blur-md"
              role="group"
              aria-label={galleryLabel ?? t("gallery")}
            >
              {club.photos.map((item, index) => (
                <button
                  type="button"
                  key={`${item.src}-${index}`}
                  className="grid size-7 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-image-foreground"
                  aria-label={`${photoLabel ?? t("photo")} ${index + 1}`}
                  aria-pressed={index === photoIndex % club.photos.length}
                  onClick={() => setPhotoIndex(index)}
                >
                  <span
                    className={cn(
                      "h-1.5 rounded-full bg-image-foreground/50 transition-[width] motion-reduce:transition-none",
                      index === photoIndex % club.photos.length
                        ? "w-4 bg-image-foreground"
                        : "w-1.5",
                    )}
                  />
                </button>
              ))}
            </div>
          )}
          <div className={s.titleRow()}>
            <h2 className={s.title()}>{club.name}</h2>
            <p className={s.rating()}>
              <StarFullIcon className={s.star()} />
              <span>{club.rating}</span>
              <span className="text-image-foreground/65">({club.reviews})</span>
            </p>
          </div>
          <p className={s.address()}>
            <MapPin1Icon className="mt-0.5 shrink-0 text-lg" />
            <span className="line-clamp-1 @[300px]/club:line-clamp-2">
              {club.address}
            </span>
          </p>
          <ul
            className={cn(
              s.facilities(),
              "hidden text-image-foreground/75 @[260px]/club:flex",
            )}
          >
            {club.facilities.map((item, index) => {
              if (!item.trim()) return null;
              const Icon = icons[index % icons.length]!;
              return (
                <li key={`${index}-${item}`} className={s.facility()}>
                  <Icon />
                  {item}
                </li>
              );
            })}
          </ul>
          <Button asChild variant="imageSolid" className={s.action()}>
            <Link href={href} scroll={false}>
              <NotebookPen aria-hidden="true" />
              {labels.discover}
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
