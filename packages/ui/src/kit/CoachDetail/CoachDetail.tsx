"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../Button";
import { ToggleGroup, ToggleGroupItem } from "../ToggleGroup";
import { ProgressiveBlur } from "../ProgressiveBlur";
import { Badge } from "../Badge";
import {
  ChevronLeftIcon,
  BookmarkIcon,
  MapPin1Icon,
  StarFullIcon,
  Calendar1Icon,
} from "../../icons";
import { coachDetailStyles as s } from "./CoachDetail.styles";
import type { CoachDetailProps } from "./CoachDetail.types";
export function CoachDetail({
  coach,
  locale,
  saved,
  onSavedChange,
  labels,
}: CoachDetailProps) {
  const [selected, setSelected] = useState("0");
  const photo = coach.photos[Number(selected)] ?? coach.photos[0]!;
  const number = new Intl.NumberFormat(locale);
  return (
    <main className={s.root()}>
      <section className={s.hero()} aria-label={coach.name}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 576px) 100vw, 576px"
          className={s.image()}
          priority
          unoptimized
        />
        <nav className={s.nav()} aria-label={labels.back}>
          <Button asChild variant="image" size="icon-lg">
            <Link
              href={`/discovery/clubs/${coach.clubId}`}
              scroll={false}
              aria-label={labels.back}
            >
              <ChevronLeftIcon className="rtl:rotate-180" />
            </Link>
          </Button>
          <Button
            variant="image"
            size="icon-lg"
            aria-label={saved ? labels.unsave : labels.save}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
          >
            <BookmarkIcon />
          </Button>
        </nav>
        <div className={s.heading()}>
          <ProgressiveBlur
            className="absolute inset-0 z-0"
            blurLayers={16}
            blurIntensity={0.25}
          />
          <div className={s.gradient()} aria-hidden="true" />
          <div className={s.content()}>
            <p className="text-sm">{coach.specialty}</p>
            <h1 className={s.title()}>{coach.name}</h1>
            <p className={s.location()}>
              <MapPin1Icon />
              {coach.location}
            </p>
          </div>
        </div>
        <ToggleGroup
          type="single"
          orientation="vertical"
          value={selected}
          onValueChange={(value) => {
            if (value) setSelected(value);
          }}
          className={s.gallery()}
          aria-label={labels.gallery}
        >
          {coach.photos.map((item, index) => (
            <ToggleGroupItem
              key={item.src}
              value={String(index)}
              className={s.thumbnail()}
              aria-label={`${labels.photo} ${number.format(index + 1)}: ${item.alt}`}
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="64px"
                className={s.image()}
                unoptimized
              />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>
      <div className={s.panel()}>
        <dl className={s.stats()}>
          {[
            {
              Icon: StarFullIcon,
              label: labels.rating,
              value: `${number.format(coach.rating)} (${number.format(coach.reviews)})`,
            },
            {
              Icon: Calendar1Icon,
              label: labels.experience,
              value: number.format(coach.yearsOfExperience),
            },
          ].map(({ Icon, label, value }) => (
            <div key={label} className={s.stat()}>
              <span className={s.icon()}>
                <Icon />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {coach.certified && (
          <Badge variant="secondary" className="self-start">
            {labels.certified}
          </Badge>
        )}
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">{labels.about}</h2>
          <p className="text-sm leading-8 text-muted-foreground">
            {coach.description}
          </p>
        </section>
        <Button asChild variant="outline">
          <Link href={`/discovery/clubs/${coach.clubId}`} scroll={false}>
            {labels.club} · {coach.clubName}
          </Link>
        </Button>
      </div>
    </main>
  );
}
