"use client";
import { useTranslations } from "@repo/i18n";
import { Like } from "@repo/ui/kit/Like";
import Image from "next/image";
import Link from "next/link";
import { useDetailHero } from "../../hooks/use-detail-hero";
import { clubDetailStyles } from "../ClubDetail/ClubDetail.styles";
import { cn } from "../../lib/utils";
import { Share1Icon } from "../../icons";
import { useState } from "react";
import {
  Calendar1Icon,
  ChevronLeftIcon,
  MapPin1Icon,
  StarFullIcon,
} from "../../icons";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { ToggleGroup, ToggleGroupItem } from "../ToggleGroup";
import { coachDetailStyles as s } from "./CoachDetail.styles";
import type { CoachDetailProps } from "./CoachDetail.types";
export function CoachDetail({
  coach,
  locale,
  saved,
  onSavedChange,
  labels,
  samples,
  services,
  reviews,
  onBook,
  onShare,
}: CoachDetailProps) {
  const info = useTranslations("CoachInformation");
  const practice = useTranslations("Practice");
  const sampleCopy = useTranslations("CoachSamples");
  const { heroRef, imageRef, heroPassed, scrolled } = useDetailHero();
  const [selected, setSelected] = useState("0");
  const photos = coach.photo
    ? [
        coach.photo,
        ...coach.photos.filter((photo) => photo.src !== coach.photo?.src),
      ]
    : coach.photos;
  const photo = photos[Number(selected)] ?? photos[0]!;
  const number = new Intl.NumberFormat(locale);
  return (
    <main className={s.root()}>
      <nav
        className={clubDetailStyles.nav({ scrolled })}
        aria-label={labels.back}
      >
        {scrolled && (
          <div className={clubDetailStyles.navGradient()} aria-hidden="true" />
        )}
        <Button asChild variant="image" size="icon-lg">
          <Link
            href={
              process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
                ? "/coaches"
                : "/discovery/coaches"
            }
            scroll={false}
            transitionTypes={["nav-back"]}
            aria-label={labels.back}
          >
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Link>
        </Button>
        <p
          aria-hidden={!heroPassed}
          className={cn(
            clubDetailStyles.navTitle(),
            "t-text-swap",
            !heroPassed && "is-exit",
          )}
        >
          {coach.name}
        </p>
        <Like
          variant="image"
          size="icon-lg"
          aria-label={saved ? labels.unsave : labels.save}
          aria-pressed={saved}
          onClick={() => onSavedChange(!saved)}
        ></Like>
      </nav>
      <section
        data-zoom-enter-key={`coach-${coach.id}`}
        ref={heroRef}
        className={s.hero()}
        aria-label={coach.name}
      >
        <div
          ref={imageRef}
          className="absolute inset-0 will-change-transform motion-reduce:will-change-auto"
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 576px) 100vw, 576px"
            className={s.image()}
            priority
            unoptimized
          />
        </div>

        <div className={s.heading()}>
          <div className={s.gradient()} aria-hidden="true" />
          <div className={s.content()}>
            <p className="text-sm">{coach.specialty}</p>
            <h1 className={s.title()}>{coach.name}</h1>
            <p className={s.location()}>
              <MapPin1Icon />
              {coach.location}
            </p>
            {coach.priceLabel && (
              <p className="text-base font-semibold">{coach.priceLabel}</p>
            )}
          </div>
        </div>
      </section>
      <div className={s.panel()}>
        <nav
          aria-label={info("details")}
          className="sticky top-0 z-20 -mx-5 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 py-3 backdrop-blur-xl"
        >
          <a
            href="#coach-about"
            className="whitespace-nowrap rounded-full bg-muted px-4 py-3 text-sm font-medium"
          >
            {labels.about}
          </a>
          {services && (
            <a
              href="#coach-services"
              className="whitespace-nowrap rounded-full bg-muted px-4 py-3 text-sm font-medium"
            >
              {practice("services")}
            </a>
          )}
          {samples && (
            <a
              href="#coach-samples"
              className="whitespace-nowrap rounded-full bg-muted px-4 py-3 text-sm font-medium"
            >
              {sampleCopy("title")}
            </a>
          )}
          {reviews && (
            <a
              href="#coach-reviews"
              className="whitespace-nowrap rounded-full bg-muted px-4 py-3 text-sm font-medium"
            >
              {practice("reviews")}
            </a>
          )}
        </nav>
        <ToggleGroup
          type="single"
          orientation="horizontal"
          value={selected}
          onValueChange={(value) => {
            if (value) setSelected(value);
          }}
          className={s.gallery()}
          aria-label={labels.gallery}
        >
          {photos.map((item, index) => (
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
                sizes="(max-width: 576px) 28vw, 170px"
                className={s.image()}
                unoptimized
              />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
        {coach.description.trim() && (
          <section
            id="coach-about"
            className="flex scroll-mt-24 flex-col gap-3"
          >
            <h2 className="text-2xl font-semibold">{labels.about}</h2>
            <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
              {coach.description}
            </p>
          </section>
        )}
        <section className="flex flex-col gap-4" aria-label={info("details")}>
          <h2 className="text-2xl font-semibold">{info("details")}</h2>
          <dl className="grid gap-4 rounded-3xl bg-muted/50 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <dt className="text-sm text-muted-foreground">
                {info("specialties")}
              </dt>
              <dd className="flex flex-wrap gap-2">
                {(coach.specialties?.length
                  ? coach.specialties
                  : [coach.specialty]
                )
                  .filter(Boolean)
                  .map((specialty) => (
                    <Badge key={specialty} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
              </dd>
            </div>
            <div className="space-y-2">
              <dt className="text-sm text-muted-foreground">
                {info("experience")}
              </dt>
              <dd className="font-medium">
                {info("years", { count: coach.yearsOfExperience })}
              </dd>
            </div>
            {coach.clubName && (
              <div className="space-y-2">
                <dt className="text-sm text-muted-foreground">
                  {info("trainingAt")}
                </dt>
                <dd className="font-medium">{coach.clubName}</dd>
              </div>
            )}
            {coach.location && (
              <div className="space-y-2">
                <dt className="text-sm text-muted-foreground">
                  {info("location")}
                </dt>
                <dd className="font-medium leading-7">{coach.location}</dd>
              </div>
            )}
          </dl>
        </section>
        {!!coach.goals?.length && (
          <section className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">{info("goals")}</h2>
            <div className="flex flex-wrap gap-2">
              {coach.goals.map((goal) => (
                <Badge key={goal} variant="secondary">
                  {goal}
                </Badge>
              ))}
            </div>
          </section>
        )}
        {services && (
          <div id="coach-services" className="scroll-mt-24">
            {services}
          </div>
        )}
        {samples && (
          <div id="coach-samples" className="scroll-mt-24">
            {samples}
          </div>
        )}
        {reviews && (
          <div id="coach-reviews" className="scroll-mt-24">
            {reviews}
          </div>
        )}
        {(onBook || onShare) && (
          <footer className={clubDetailStyles.footer()}>
            {onShare && (
              <Button
                variant="outline"
                size="icon-lg"
                className="size-12 bg-secondary text-secondary-foreground"
                aria-label={labels.share}
                onClick={onShare}
              >
                <Share1Icon />
              </Button>
            )}
            {onBook && (
              <Button
                className="h-12 flex-1 bg-primary text-primary-foreground"
                onClick={onBook}
              >
                {labels.book}
              </Button>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}
