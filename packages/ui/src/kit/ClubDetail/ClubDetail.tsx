"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useClubPhoto } from "../../hooks/use-club-photo";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeftIcon,
  BookmarkIcon,
  ClockIcon,
  MapPin1Icon,
  StarFullIcon,
  Share1Icon,
  BarbellHorizontalIcon,
  UserIcon,
  Shower1Icon,
  WifiFullIcon,
  UsersThreeIcon,
  WindIcon,
  CalendarPlusIcon,
} from "../../icons";
import { Button } from "../Button";
import { Separator } from "../Separator";
import { EquipmentCard } from "../EquipmentCard";
import { SlidingNumber } from "../SlidingNumber";
import { clubDetailStyles as s } from "./ClubDetail.styles";
import type { ClubDetailProps } from "./ClubDetail.types";

const equipmentIcons = {
  weights: BarbellHorizontalIcon,
  coaching: UserIcon,
  showers: Shower1Icon,
  wifi: WifiFullIcon,
  group: UsersThreeIcon,
  air: WindIcon,
};

export function ClubDetail({
  club,
  saved,
  onSavedChange,
  onShare,
  onPlanVisit,
  labels,
  coaches,
  reviews,
  availability,
  galleryPreview,
  socialShare,
  categories,
  branches,
  recommendations,
}: ClubDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const [scrolled, setScrolled] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8);
      setHeroPassed(
        (heroRef.current?.getBoundingClientRect().bottom ?? 1) <= 0,
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const [photoIndex, setPhotoIndex] = useClubPhoto(club.id);
  const photo = club.photos[photoIndex] ?? club.photos[0];
  return (
    <main className={s.root()}>
      <nav className={s.nav({ scrolled })} aria-label={labels.back}>
        {scrolled && (
          <>
            <div aria-hidden="true" className={s.navGradient()} />
          </>
        )}
        <Button asChild variant="image" size="icon-lg">
          <Link href="/discovery" scroll={false} aria-label={labels.back}>
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Link>
        </Button>
        <p
          aria-hidden={!heroPassed}
          className={cn(s.navTitle(), "t-text-swap", !heroPassed && "is-exit")}
        >
          {club.name}
        </p>
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

      <section ref={heroRef} className={s.hero()} aria-label={club.name}>
        <div
          className="absolute inset-0"
          data-zoom-enter-key={`club-${club.id}`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className={s.image()}
            priority
            unoptimized
          />
        </div>
        <div className={s.overlay()} />
      </section>
      <div className={s.panel()}>
        <div className={s.heading()}>
          <div className={s.headingContent()}>
            <p className={s.category()}>{club.category}</p>
            <h1 className={s.title()}>{club.name}</h1>
          </div>
          <p className={s.price()}>
            {club.priceValue === null ? (
              club.price
            ) : (
              <SlidingNumber
                value={club.priceValue}
                locale={club.locale}
                useGrouping
              />
            )}{" "}
            {club.priceValue !== null && club.priceCurrency}
            {club.priceValue !== null && (
              <span className={s.period()}>{club.pricePeriod}</span>
            )}
          </p>
        </div>

        <div className="club-detail-actions">
          {onPlanVisit && (
            <button type="button" onClick={onPlanVisit}>
              <CalendarPlusIcon />
              <span>{labels.visit}</span>
            </button>
          )}
          <button type="button" onClick={onShare}>
            <Share1Icon />
            <span>{labels.share}</span>
          </button>
          <button
            type="button"
            onClick={() => onSavedChange(!saved)}
            aria-pressed={saved}
          >
            <BookmarkIcon />
            <span>{saved ? labels.unsave : labels.save}</span>
          </button>
        </div>
        <div className={s.gallery()} role="group" aria-label={labels.gallery}>
          {club.photos.map((item, index) => (
            <button
              type="button"
              key={item.src}
              className={s.thumbnail({ selected: index === photoIndex })}
              aria-label={`${labels.photo} ${index + 1}: ${item.alt}`}
              aria-pressed={index === photoIndex}
              onClick={() => setPhotoIndex(index)}
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="(max-width: 640px) 28vw, 260px"
                className={s.image()}
                unoptimized
              />
            </button>
          ))}
        </div>
        <dl className={s.stats()}>
          {[
            { Icon: ClockIcon, value: club.hours, label: labels.hours },
            {
              Icon: MapPin1Icon,
              value: club.userDistance ?? labels.distanceUnavailable,
              label: labels.distance,
            },
            {
              Icon: StarFullIcon,
              value: `${club.rating} (${club.reviews})`,
              label: labels.reviews,
            },
            {
              Icon: UsersThreeIcon,
              value: new Intl.NumberFormat(club.locale).format(club.coachCount),
              label: labels.coachCount,
            },
          ].map(({ Icon, value, label }) => (
            <div className={s.stat()} key={label}>
              <span className={s.statIcon()}>
                <Icon />
              </span>
              <div className="min-w-0 flex-1 text-start">
                <dt className={s.caption()}>{label}</dt>
                <dd className={s.statValue()}>{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <section className={s.section()}>
          <h2 className={s.sectionTitle()}>{labels.about}</h2>
          <div className="flex flex-col gap-2">
            <p
              id={descriptionId}
              className={cn(s.description(), !expanded && "line-clamp-3")}
            >
              {club.description}
            </p>
            <Button
              variant="outline"
              className="self-start"
              aria-expanded={expanded}
              aria-controls={descriptionId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? labels.seeLess : labels.seeMore}
            </Button>
          </div>
        </section>
        <Separator />
        {galleryPreview}
        {availability}
        <section className={s.section()}>
          <h2 className={s.sectionTitle()}>{labels.amenities}</h2>
          <ul
            className={s.amenities()}
            tabIndex={0}
            aria-label={labels.amenities}
          >
            {club.amenities.map((item) => {
              const Icon =
                equipmentIcons[
                  item.icon ?? (item.id as keyof typeof equipmentIcons)
                ] ?? BarbellHorizontalIcon;
              return (
                <li key={item.id}>
                  <EquipmentCard
                    label={item.label}
                    description={item.description}
                    icon={<Icon />}
                  />
                </li>
              );
            })}
          </ul>
        </section>
        {categories}
        {branches}
        {coaches}
        {reviews}
        {recommendations}
        {socialShare}
        <footer className={s.footer()}>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-12"
            aria-label={labels.share}
            onClick={onShare}
          >
            <Share1Icon />
          </Button>
          {onPlanVisit && (
            <Button size="lg" className="h-12 flex-1" onClick={onPlanVisit}>
              <CalendarPlusIcon data-icon="inline-start" />
              {labels.visit}
            </Button>
          )}
        </footer>
      </div>
    </main>
  );
}
