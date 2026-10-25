"use client";
import Image from "next/image";
import { useState } from "react";
import { Check, Heart, MapPin, Building2 } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { cn } from "../../lib/utils";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "../Avatar";
import { locationCardStyles as s } from "./LocationCard.styles";
import type { LocationCardProps } from "./LocationCard.types";
export function LocationCard({
  name,
  parent,
  cover,
  clubs = [],
  clubCount,
  kindLabel,
  tone = "green",
  className,
  selected,
  active,
  saved,
  onSavedChange,
  saveLabel,
  selectionProps,
  onSelect,
}: LocationCardProps) {
  const [failedImage, setFailedImage] = useState<string>();
  const t = useTranslations("LocationDiscovery");
  return (
    <article data-slot="location-card" className={cn(s.root(), className)}>
      <div
        className="absolute inset-0 grid place-items-center bg-linear-to-br from-teal-500 via-teal-800 to-slate-900"
        aria-hidden="true"
      >
        <MapPin className="size-24 text-white/15" strokeWidth={1} />
      </div>
      {cover && failedImage !== cover.src && (
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover transition-transform duration-500 motion-safe:group-hover/location:scale-105 motion-reduce:transition-none"
          onError={() => setFailedImage(cover.src)}
          unoptimized
        />
      )}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-t via-40% to-transparent to-75%",
          tone === "sky"
            ? "from-sky-700/85 via-sky-700/10"
            : tone === "amber"
              ? "from-amber-900/85 via-amber-900/10"
              : "from-emerald-800/85 via-emerald-800/10",
        )}
      />
      <div className={s.overlay()} />
      <button
        {...selectionProps}
        type="button"
        onClick={onSelect}
        className={cn(
          s.action(),
          (selected || active) && "ring-2 ring-inset ring-white",
        )}
        aria-label={[name, parent].filter(Boolean).join(" · ")}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-[8%]">
        {kindLabel ? <span className={s.pill()}>{kindLabel}</span> : <span />}
        {onSavedChange ? (
          <button
            type="button"
            aria-label={saveLabel}
            aria-pressed={saved ?? false}
            onClick={() => onSavedChange(!saved)}
            className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <Heart
              size={19}
              aria-hidden="true"
              className={saved ? "fill-current" : undefined}
            />
          </button>
        ) : selected ? (
          <span className="grid size-8 place-items-center rounded-full bg-white text-emerald-900">
            <Check size={18} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className={s.content()}>
        <h3 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
          {name}
        </h3>
        {parent && (
          <p className="flex items-center gap-1.5 text-xs text-white/85">
            <MapPin size={12} aria-hidden="true" className="shrink-0" />
            {parent}
          </p>
        )}
        {(clubCount !== undefined || clubs.length > 0) && (
          <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
            {clubCount !== undefined && (
              <span className={cn(s.pill(), "min-w-0")}>
                <Building2 size={13} aria-hidden="true" className="shrink-0" />
                {t("clubCount", { count: clubCount })}
              </span>
            )}
            {clubs.length ? (
              <AvatarGroup className="shrink-0 gap-0 *:data-[slot=avatar]:ring-white/80 [&>[data-slot=avatar]+[data-slot=avatar]]:-ms-2">
                {clubs.slice(0, 3).map((club) => (
                  <Avatar key={club.id} size="sm">
                    <AvatarImage src={club.image} alt={club.name} />
                    <AvatarFallback>{club.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
