"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import type { FitnessClub } from "./clubs";

import { useFormatter, useLocale, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/toggle-group";

import styles from "./club.module.css";
import ClubBooking from "./ClubBooking";
import ClubIcon from "./ClubIcon";
import ClubSections from "./ClubSections";
import ClubServices, { useSessions } from "./ClubServices";
import PublishedClubSections from "./PublishedClubSections";
import { averageRating } from "./reviews";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("gym4me:favorite", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("gym4me:favorite", callback);
  };
};

const ClubView = (props: { club: FitnessClub }) => {
  const t = useTranslations("Club");
  const format = useFormatter();
  const locale = useLocale();
  const { club } = props;
  const sessions = useSessions();
  const published = club.published;
  const [photoIndex, setPhotoIndex] = useState("0");
  const [visitOpen, setVisitOpen] = useState(false);
  const [bookingItems, setBookingItems] = useState<string[]>([]);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState("club-photos");
  useEffect(() => {
    const ids = [
      "club-photos",
      "club-about",
      "club-services",
      "club-membership",
      "club-reviews",
      "club-sports",
      "club-equipment",
      "club-location",
      "club-owner",
      "club-hours",
    ];
    const update = () => {
      let current = ids[0]!;
      for (const id of ids) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 120) current = id;
      }
      setActiveSection(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const favoriteKey = `gym4me.favorite.${club.id}`;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(favoriteKey) === "true";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const photo = club.photos[Number(photoIndex)] ?? club.photos[0]!;
  function toggleFavorite() {
    try {
      localStorage.setItem(favoriteKey, String(!saved));
      window.dispatchEvent(new Event("gym4me:favorite"));
      setNotice(saved ? t("clubRemovedFromYourSavedClubs") : t("clubSavedToThisDevice"));
    } catch {
      setNotice(t("yourBrowserCouldNotSaveThisClubPleaseAllowLocalStorageAndTryAgain"));
    }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: club.name, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setNotice(t("clubLinkCopied"));
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setNotice(t("sharingIsUnavailableCopyTheClubLinkFromYourAddressBar"));
    }
  }
  return (
    <main className={styles.page}>
      <header className={styles.brandbar}>
        <Link href="/" className={styles.brand}>
          <Image src="/gym4me-logo.png" alt="" width={30} height={30} unoptimized />
          {t("gym4Me")}
        </Link>
        <span className={styles.edition}>{t("findYourFit")}</span>
      </header>
      <article className={styles.club}>
        <section id="club-photos" className={styles.hero} aria-label={t("clubPhotos")}>
          {photo ?
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 1100px"
              className={styles.heroImage}
            />
          : <p>{t("missingPhotos")}</p>}
          <nav className={styles.heroNav} aria-label={t("clubNavigation")}>
            <AnimatedButton asChild iconOnly color="secondary" size="xl" radius="full">
              <Link href="/" aria-label={t("backToHome")}>
                <ClubIcon name="back" />
              </Link>
            </AnimatedButton>
            <div className={styles.heroActions}>
              <AnimatedButton
                iconOnly
                color="secondary"
                size="xl"
                radius="full"
                aria-label={t("shareClub")}
                onClick={share}
              >
                <ClubIcon name="share" />
              </AnimatedButton>
              <AnimatedButton
                iconOnly
                color={saved ? "primary" : "secondary"}
                size="xl"
                radius="full"
                aria-label={saved ? t("unsaveClub") : t("saveClub")}
                aria-pressed={saved}
                onClick={toggleFavorite}
              >
                <ClubIcon name="heart" fill={saved ? "currentColor" : "none"} />
              </AnimatedButton>
            </div>
          </nav>
          {club.photos.length > 0 && (
            <button
              className={styles.photoCount}
              aria-label={t("showNextClubPhoto")}
              onClick={() => setPhotoIndex(String((Number(photoIndex) + 1) % club.photos.length))}
            >
              {format.number(Number(photoIndex) + 1)}/{format.number(club.photos.length)}
            </button>
          )}
        </section>
        <div className={styles.details}>
          <h1>{club.name}</h1>
          <p className={styles.subtitle}>
            {published ? published.labels[published.clubTypeId] : t("fitnessTraining")}
          </p>
          {!published && (
            <div className={styles.rating}>
              <ClubIcon name="star" />
              <Link href={`/clubs/${club.id}/reviews/`}>
                <strong>{averageRating(club.reviewEntries, locale)}</strong>{" "}
                <span>({format.number(club.reviewEntries.length)})</span>
              </Link>
              <span>·</span>
              <ClubIcon name="clock" />
              <span>{club.hours}</span>
            </div>
          )}
          <a href="#club-location" className={styles.location}>
            <ClubIcon name="pin" />
            {club.neighborhood}
          </a>
          {club.photos.length > 0 && (
            <ToggleGroup
              aria-label={t("chooseClubPhoto")}
              value={[photoIndex]}
              onValueChange={(values) => {
                if (values[0]) setPhotoIndex(values[0]);
              }}
              className={styles.thumbnails}
            >
              {club.photos.map((item, index) => (
                <ToggleGroupItem
                  key={item.src}
                  value={String(index)}
                  aria-label={t("showPhoto", { name: item.label })}
                  className={styles.thumbnail}
                >
                  <Image src={item.src} alt="" fill unoptimized sizes="160px" />
                  <span>{item.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <section id="club-about" className={styles.about}>
            <h2>{t("about")}</h2>
            <p>{club.description}</p>
          </section>
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        </div>
      </article>
      <nav className={styles.tabs} aria-label={t("clubSections")}>
        {(published ?
          [
            ["club-photos", t("photos")],
            ["club-about", t("about")],
            ["club-sports", t("sports")],
            ...(published.equipment.length ? [["club-equipment", t("equipment")]] : []),
            ["club-location", t("location")],
            ["club-hours", t("clubAmenities")],
          ]
        : [
            ["club-photos", t("photos")],
            ["club-about", t("about")],
            ["club-services", t("sessions")],
            ["club-membership", t("membership")],
            ["club-owner", t("team")],
            ["club-reviews", t("reviews")],
            ["club-hours", t("other")],
          ]
        ).map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-current={activeSection === id ? "location" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      {!published && (
        <div className={styles.content}>
          <ClubServices
            onSelect={(id) => {
              setBookingItems([id]);
              setVisitOpen(true);
            }}
          />
          <section id="club-membership" className={styles.more}>
            <h2>{t("membership")}</h2>
            <div className={styles.membership}>
              <div>
                <h3>{t("monthlyMembership")}</h3>
                <p>{t("makeTrainingPartOfYourRoutine")}</p>
                <strong>{t("monthlyPrice", { amount: club.monthlyPrice })}</strong>
              </div>
              <AnimatedButton
                radius="full"
                color="neutral"
                variant="outlined"
                onClick={() => setMembershipOpen(!membershipOpen)}
                aria-expanded={membershipOpen}
              >
                {t("details")}
              </AnimatedButton>
            </div>
            {membershipOpen && (
              <p className={styles.membershipNote}>
                {t(
                  "confirmCurrentPricingIncludedClassesAndCancellationTermsWithTheClubBeforeJoiningMembershipPurchasesAreNotAvailableInThisPreview",
                )}
              </p>
            )}
          </section>
        </div>
      )}
      {published ?
        <PublishedClubSections club={published} />
      : <ClubSections club={club} />}
      <section id="club-hours" className={styles.more}>
        {!published && (
          <>
            <h2>{t("openingTimes")}</h2>
            <dl className={styles.hours}>
              {[
                t("monday"),
                t("tuesday"),
                t("wednesday"),
                t("thursday"),
                t("friday"),
                t("saturday"),
                t("sunday"),
              ].map((day) => (
                <div key={day}>
                  <dt>{day}</dt>
                  <dd>{club.hours}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <h2>{t("clubAmenities")}</h2>
        {!club.amenities.length && <p>{t("missingAmenities")}</p>}
        <ul className={styles.amenityList}>
          {club.amenities.map((item) => (
            <li key={item}>
              <ClubIcon name="check" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <footer className={styles.bookbar}>
        <div>
          <strong>
            {published ? t("publishedDetails") : t("availableSessions", { count: sessions.length })}
          </strong>
          <small>
            {published ? t("bookingUnavailable") : t("previewClubSampleDetailsAndPricing")}
          </small>
        </div>
        {!published && (
          <AnimatedButton
            size="xl"
            radius="full"
            color="neutral"
            onClick={() => {
              setBookingItems([]);
              setVisitOpen(true);
            }}
          >
            {t("bookNow")}
          </AnimatedButton>
        )}
      </footer>
      {visitOpen && (
        <ClubBooking club={club} initial={bookingItems} onClose={() => setVisitOpen(false)} />
      )}
    </main>
  );
};
export default ClubView;
