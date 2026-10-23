"use client";

import { useClubPhoto } from "../../hooks/use-club-photo";
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
}: ClubCardProps) {
  const [photoIndex] = useClubPhoto(club.id);
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
          s.cover({ size }),
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
            {club.price} <span className={s.muted()}>/ {club.pricePeriod}</span>
          </p>
        )}
        {onSavedChange && (
          <Button
            className="pointer-events-auto"
            size="icon-lg"
            variant="imageSolid"
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
            {club.price} / {club.pricePeriod}
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
              const Icon = icons[index % icons.length]!;
              return (
                <li key={item} className={s.facility()}>
                  <Icon />
                  {item}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className={s.content()}>
          <div className={s.titleRow()}>
            <h2 className={s.title()}>{club.name}</h2>
            <p className={s.rating()}>
              <StarFullIcon className={s.star()} />
              <span>{club.rating}</span>
              <span className="text-muted-foreground">({club.reviews})</span>
            </p>
          </div>
          <p className={s.address()}>
            <MapPin1Icon className="mt-0.5 shrink-0 text-lg" />
            {club.address}
          </p>
          <ul className={s.facilities()}>
            {club.facilities.map((item, index) => {
              const Icon = icons[index % icons.length]!;
              return (
                <li key={item} className={s.facility()}>
                  <Icon />
                  {item}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
