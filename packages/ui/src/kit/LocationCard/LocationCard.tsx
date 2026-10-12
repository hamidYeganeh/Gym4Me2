"use client";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "../Avatar";
import { Badge } from "../Badge";
import { locationCardStyles as s } from "./LocationCard.styles";
import type { LocationCardProps } from "./LocationCard.types";
export function LocationCard({
  name,
  parent,
  cover,
  clubs,
  countLabel,
  onSelect,
}: LocationCardProps) {
  return (
    <article className={s.root()}>
      <Image
        src={cover.src}
        alt={cover.alt}
        fill
        sizes="224px"
        className="object-cover"
        unoptimized
      />
      <div className={s.overlay()} />
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 rounded-[inherit] outline-none   "
        aria-label={`${name}، ${parent}`}
      />
      <div className={s.content()}>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-image-foreground/75">{parent}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge variant="secondary">{countLabel}</Badge>
          <AvatarGroup className="gap-0 [&>[data-slot=avatar]+[data-slot=avatar]]:-ms-2">
            {clubs.slice(0, 3).map((club) => (
              <Avatar key={club.id}>
                <AvatarImage src={club.image} alt={club.name} />
                <AvatarFallback>{club.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        </div>
      </div>
    </article>
  );
}
