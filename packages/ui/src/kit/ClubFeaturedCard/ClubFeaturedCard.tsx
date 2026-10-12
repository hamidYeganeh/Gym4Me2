"use client";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "../Button";
import { clubFeaturedCardStyles as s } from "./ClubFeaturedCard.styles";
import type { ClubFeaturedCardProps } from "./ClubFeaturedCard.types";
export function ClubFeaturedCard({ club, viewLabel }: ClubFeaturedCardProps) {
  return (
    <article className={s.root()}>
      <Image
        src={club.photos[0].src}
        alt={club.photos[0].alt}
        fill
        sizes="576px"
        className="object-cover"
        unoptimized
      />
      <div className={s.gradient()} />
      <div className={s.logo()}>
        <Image
          src={club.logo ?? club.photos[0].src}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className={s.content()}>
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xl font-semibold">{club.name}</h2>
          <p className="flex items-center gap-2 text-sm text-image-foreground/80">
            <Star className="size-4 text-rating" fill="currentColor" />
            {club.rating} · {club.category}
          </p>
        </div>
        <Button asChild variant="image" size="sm">
          <Link href={`/discovery/clubs/${club.id}`} scroll={false}>
            {viewLabel}
          </Link>
        </Button>
      </div>
    </article>
  );
}
