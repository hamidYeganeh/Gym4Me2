"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin1Icon as MapPin } from "../../icons";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "../Avatar";
import { ProgressiveBlur } from "../ProgressiveBlur";
import { locationCardStyles as s } from "./LocationCard.styles";
import type { LocationCardProps } from "./LocationCard.types";
export function LocationCard({
  name,
  parent,
  cover,
  clubs = [],
  clubCount,
  kindLabel,
  className,
  selected,
  active,
  selectionProps,
  onSelect,
  href,
}: LocationCardProps) {
  const [failedImage, setFailedImage] = useState<string>();
  const t = useTranslations("LocationDiscovery");
  const locale = useLocale();
  const remaining = Math.max(0, (clubCount ?? clubs.length) - 3);
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
      <ProgressiveBlur
        className="absolute! inset-x-0 bottom-0 h-2/3"
        blurLayers={4}
        blurIntensity={1.5}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            selected || active
              ? "linear-gradient(to top, color-mix(in srgb, var(--primary) 38%, #06140b) 0%, color-mix(in srgb, var(--primary) 18%, transparent) 45%, transparent 85%)"
              : "linear-gradient(to top, #09120edb, transparent 85%)",
        }}
      />
      {href ? (
        <Link
          href={href}
          className={s.action()}
          aria-label={[name, parent].filter(Boolean).join(" · ")}
        />
      ) : onSelect ? (
        <button
          {...selectionProps}
          type="button"
          onClick={onSelect}
          className={cn(
            s.action(),
            (selected || active) && "ring-2 ring-inset ring-primary",
          )}
          aria-label={[name, parent].filter(Boolean).join(" · ")}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-[8%]">
        {kindLabel ? <span className={s.pill()}>{kindLabel}</span> : <span />}
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
          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
            {clubs.length ? (
              <AvatarGroup className="shrink-0 gap-0 *:data-[slot=avatar]:ring-white/80 [&>[data-slot=avatar]+[data-slot=avatar]]:-ms-2">
                {clubs.slice(0, 3).map((club) => (
                  <Avatar key={club.id} size="sm">
                    <AvatarImage src={club.image} alt={club.name} />
                    <AvatarFallback>{club.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                ))}
                {remaining > 0 && (
                  <Avatar
                    size="sm"
                    aria-label={t("clubCount", { count: remaining })}
                  >
                    <AvatarFallback
                      className="bg-card text-foreground text-[10px]"
                      dir="ltr"
                    >
                      +{new Intl.NumberFormat(locale).format(remaining)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </AvatarGroup>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
