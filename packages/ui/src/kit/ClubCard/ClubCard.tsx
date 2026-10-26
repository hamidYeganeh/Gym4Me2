"use client";

import { useClubPhoto } from "../../hooks/use-club-photo";
import { useTranslations } from "@repo/i18n";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  GitCompareArrows,
  MapPin,
  Star,
  Dumbbell,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../Button";
import { ProgressiveBlur } from "../ProgressiveBlur";
import { clubCardStyles as s } from "./ClubCard.styles";
import type { ClubCardProps } from "./ClubCard.types";
import "./ClubCard.css";

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
  compareHref,
  compareLabel,
}: ClubCardProps) {
  const [photoIndex, setPhotoIndex] = useClubPhoto(club.id);
  const t = useTranslations("Clubs");
  const photo = club.photos[photoIndex] ?? club.photos[0];
  const href = club.href ?? `/discovery/clubs/${encodeURIComponent(club.id)}`;
  const landscape = variant === "landscape";
  const imageVariant = variant === "portrait" || variant === "cinematic";
  const rating = (
    <p className="club-card-rating">
      <Star size={13} />
      <span>{club.rating}</span>
      <span>({club.reviews})</span>
    </p>
  );
  return (
    <article
      data-slot="club-card"
      data-variant={variant}
      className={cn(s.root({ size, variant }), "club-card", className)}
    >
      <div className="club-card-cover" data-zoom-exit-key={`club-${club.id}`}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={landscape ? "120px" : "(max-width: 640px) 85vw, 560px"}
          className="object-cover"
          priority={priority}
          unoptimized
        />
      </div>
      {!landscape && (
        <>
          <ProgressiveBlur
            className="club-card-blur"
            blurLayers={4}
            blurIntensity={1.5}
          />
          <div className="club-card-shade" aria-hidden="true" />
        </>
      )}
      <Link
        href={href}
        scroll={false}
        className={s.link()}
        aria-label={`${labels.discover} · ${club.name}`}
      />
      <div className="club-card-actions">
        {onSavedChange && (
          <Button
            size="icon-lg"
            variant={imageVariant ? "image" : "secondary"}
            type="button"
            aria-label={saved ? labels.unsave : labels.save}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
          >
            <Bookmark className={saved ? "fill-current" : undefined} />
          </Button>
        )}
        {compareHref && (
          <Button
            asChild
            size="icon-lg"
            variant={imageVariant ? "image" : "secondary"}
          >
            <Link href={compareHref} aria-label={compareLabel ?? t("compare")}>
              <GitCompareArrows />
            </Link>
          </Button>
        )}
      </div>
      {featuredLabel && (
        <span className="club-card-featured">{featuredLabel}</span>
      )}
      {!landscape && rating}
      <div className="club-card-copy">
        <div className="club-card-heading">
          <h2>{club.name}</h2>
        </div>
        <p className="club-card-address">
          <MapPin size={14} />
          <span>{club.address}</span>
        </p>
        <p className="club-card-price">
          {club.price}
          {club.pricePeriod && <small> / {club.pricePeriod}</small>}
        </p>
        {landscape && rating}
        <ul className="club-card-facilities">
          {club.facilities
            .slice(0, 2)
            .filter(Boolean)
            .map((item, index) => (
              <li key={index}>
                {index === 0 && <Dumbbell size={14} />}
                <span>{item}</span>
              </li>
            ))}
        </ul>
        {!landscape && club.photos.length > 1 && (
          <div
            className="club-card-dots"
            role="group"
            aria-label={galleryLabel ?? t("gallery")}
          >
            {club.photos.map((item, index) => (
              <button
                key={`${item.src}-${index}`}
                type="button"
                aria-label={`${photoLabel ?? t("photo")} ${index + 1}`}
                aria-pressed={index === photoIndex % club.photos.length}
                onClick={() => setPhotoIndex(index)}
              >
                <span />
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
