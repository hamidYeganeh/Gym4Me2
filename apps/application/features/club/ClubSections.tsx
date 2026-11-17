"use client";

import Link from "next/link";

import type { FitnessClub } from "./clubs";

import { useFormatter, useLocale, useTranslations } from "@repo/i18n";
import { Badge } from "@repo/ui/kit/badge";
import { AnimatedButton } from "@repo/ui/kit/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/kit/card";
import { Separator } from "@repo/ui/kit/separator";
import {
  AnimatedSheet,
  AnimatedSheetClose,
  AnimatedSheetContent,
  AnimatedSheetTitle,
  AnimatedSheetTrigger,
} from "@repo/ui/kit/sheet";

import ClubIcon from "./ClubIcon";
import ReviewItem from "./ReviewItem";
import { averageRating } from "./reviews";
import styles from "./sections.module.css";

const ClubSections = (props: { club: FitnessClub }) => {
  const t = useTranslations("Club");
  const format = useFormatter();
  const locale = useLocale();
  const { club } = props;
  const ownerCard = (
    <Card size="lg" radius="2xl" className={styles.ownerCard}>
      <CardHeader>
        <div className={styles.ownerAvatar} aria-hidden="true">
          {club.owner.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </div>
        <CardTitle>{club.owner.name}</CardTitle>
        <CardDescription>
          {t("clubOwner")} · {club.owner.role}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className={styles.ownerStats}>
          <div>
            <dt>{t("reviews")}</dt>
            <dd>{format.number(club.reviewEntries.length)}</dd>
          </div>
          <div>
            <dt>{t("clubRating")}</dt>
            <dd>{averageRating(club.reviewEntries, locale)} ★</dd>
          </div>
          <div>
            <dt>{t("clubFounded")}</dt>
            <dd>{club.owner.founded}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Badge color="secondary" size="sm" radius="full">
          {t("sampleOwnerProfile")}
        </Badge>
      </CardFooter>
    </Card>
  );
  return (
    <div className={styles.sections}>
      <nav className={styles.sectionNav} aria-label={t("exploreThisClub")}>
        <a href="#club-highlights">{t("highlights")}</a>
        <a href="#club-reviews">{t("reviews")}</a>
        <a href="#club-location">{t("location")}</a>
        <a href="#club-owner">{t("clubOwner")}</a>
        <a href="#club-guidelines">{t("thingsToKnow")}</a>
      </nav>
      <section id="club-highlights" className={styles.section} aria-labelledby="highlights-title">
        <p className={styles.eyebrow}>{t("trainingAtThisClub")}</p>
        <h2 id="highlights-title">{t("spaceCoachingAndRoutine")}</h2>
        <div className={styles.highlights}>
          {club.highlights.map((item) => (
            <div key={item.title}>
              <ClubIcon name="check" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Separator />
      <section id="club-reviews" className={styles.section} aria-labelledby="reviews-title">
        <div className={styles.sectionHeading}>
          <h2 id="reviews-title">{t("memberReviews")}</h2>
          <Badge variant="outlined" color="secondary" size="sm">
            {t("sampleReviews")}
          </Badge>
        </div>
        <h3 className={styles.topicTitle}>{t("memberReviewsMention")}</h3>
        <div className={styles.topicRow}>
          {Array.from(new Set(club.reviewEntries.map((review) => review.training))).map(
            (training) => (
              <AnimatedButton
                key={training}
                asChild
                radius="full"
                variant="outlined"
                color="neutral"
              >
                <Link
                  href={`/clubs/${club.id}/reviews/#${club.reviewEntries.find((review) => review.training === training)?.id}`}
                >
                  {training} ·{" "}
                  {format.number(
                    club.reviewEntries.filter((review) => review.training === training).length,
                  )}
                </Link>
              </AnimatedButton>
            ),
          )}
        </div>
        <div className={styles.reviewGrid}>
          {club.reviewEntries.slice(0, 2).map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
        <AnimatedButton asChild color="secondary" radius="lg" size="lg" className="w-full">
          <Link href={`/clubs/${club.id}/reviews/`}>
            {t("showReviews", { count: club.reviewEntries.length })}
            <ClubIcon name="arrow" data-icon="inline-end" />
          </Link>
        </AnimatedButton>
      </section>
      <Separator />
      <section id="club-location" className={styles.section} aria-labelledby="location-title">
        <h2 id="location-title">{t("whereYoullTrain")}</h2>
        <div className={styles.location}>
          <div className={styles.locationMark}>
            <ClubIcon name="pin" />
          </div>
          <div>
            <h3>{club.neighborhood}</h3>
            <p>{club.locationDescription}</p>
            <p className={styles.small}>
              {t("neighbourhoodShownExactClubAddressIsNotAvailableInThisPreview")}
            </p>
          </div>
        </div>
        <AnimatedButton asChild color="neutral" variant="outlined" radius="lg" size="lg">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.neighborhood)}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("exploreTheNeighbourhood")}
            <ClubIcon name="arrow" data-icon="inline-end" />
          </a>
        </AnimatedButton>
      </section>
      <Separator />
      <section id="club-owner" className={styles.section} aria-labelledby="owner-title">
        <h2 id="owner-title">{t("clubOwner")}</h2>
        <div className={styles.ownerLayout}>
          {ownerCard}
          <div className={styles.ownerBio}>
            <h3>{t("aboutOwner", { name: club.owner.name.split(" ")[0] ?? club.owner.name })}</h3>
            <p>{club.owner.bio}</p>
            <Separator />
            <p>
              <strong>
                {t("ownerHistory", {
                  since: club.owner.coachingSince,
                  founded: club.owner.founded,
                })}
              </strong>
            </p>
            <p>
              <strong>{t("languages")}</strong>
              <br />
              {club.owner.languages.join(" · ")}
            </p>
            <p>
              <strong>{t("atTheClub")}</strong>
              <br />
              {club.owner.availability}
            </p>
            <AnimatedSheet>
              <AnimatedSheetTrigger
                render={<AnimatedButton color="neutral" variant="outlined" radius="lg" />}
              >
                {t("showOwnerProfile")}
              </AnimatedSheetTrigger>
              <AnimatedSheetContent side="bottom" className="mx-auto max-w-xl rounded-t-3xl">
                <div className="flex items-center justify-between gap-4">
                  <AnimatedSheetTitle>{t("clubOwnerProfile")}</AnimatedSheetTitle>
                  <AnimatedSheetClose aria-label={t("closeOwnerProfile")}>
                    <ClubIcon name="close" width={20} height={20} />
                  </AnimatedSheetClose>
                </div>
                {ownerCard}
                <ul className={styles.ownerFacts}>
                  <li>
                    <ClubIcon name="check" />
                    {t("roleSince", { role: club.owner.role, since: club.owner.coachingSince })}
                  </li>
                  <li>
                    <ClubIcon name="check" />
                    {t("speaks", { languages: club.owner.languages.join("، ") })}
                  </li>
                  <li>
                    <ClubIcon name="pin" />
                    {club.neighborhood}
                  </li>
                </ul>
                <Separator />
                <p>{club.owner.bio}</p>
                <p className={styles.small}>{club.owner.availability}</p>
              </AnimatedSheetContent>
            </AnimatedSheet>
          </div>
        </div>
      </section>
      <Separator />
      <section id="club-guidelines" className={styles.section} aria-labelledby="guidelines-title">
        <h2 id="guidelines-title">{t("thingsToKnow")}</h2>
        <div className={styles.guidelines}>
          <div>
            <ClubIcon name="clock" />
            <h3>{t("yourFirstVisit")}</h3>
            <p>{t("dailyHours", { hours: club.hours })}</p>
            <p>{t("bringIndoorTrainersAWaterBottleAndATowelStartAtReceptionForATour")}</p>
          </div>
          <div>
            <ClubIcon name="check" />
            <h3>{t("trainingTogether")}</h3>
            <p>{t("wipeEquipmentAfterUseReturnYourWeightsAndGiveOthersRoomToTrain")}</p>
            <p>{t("askACoachIfYouNeedHelpWithEquipment")}</p>
          </div>
          <div>
            <ClubIcon name="heart" />
            <h3>{t("membershipDetails")}</h3>
            <p>
              {t("confirmCurrentPricingClassAccessAndCancellationTermsWithTheClubBeforeJoining")}
            </p>
            <p>{t("noPaymentOrReservationIsMadeThroughThisPreview")}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
export default ClubSections;
