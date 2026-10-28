"use client";
import Link from "next/link";
import { Button } from "@repo/ui/kit/Button";
import { Price as PracticeMoney, amount } from "../luma/common";
import { ReviewReactions } from "@repo/ui/account";
import { StarFullIcon } from "@repo/ui/icons";
import { serviceHref } from "@repo/ui/lib/public-route";
import { usePracticeQuery, type CoachDetailDto } from "@repo/api/profile";
import { useLocale, useTranslations } from "@repo/i18n";
import { CoachSamples } from "@repo/ui/account";
import { CoachDetail } from "@repo/ui/kit/CoachDetail";
import { toast } from "@repo/ui/kit/Sileo";
import { useRouter } from "next/navigation";
import { CatalogState } from "./catalog-state";
import { useSavedCoach } from "./use-saved-coach";
export function PublicCoachPage({ username, initialCoach }: { username: string; initialCoach?: CoachDetailDto }) {
  const query = usePracticeQuery<CoachDetailDto>(
    `coaching/directory/${username}`,
    {},
    true,
    initialCoach,
  );
  const locale = useLocale(),
    t = useTranslations("CoachDetail"),
    c = useTranslations("Coaches"),
    clubs = useTranslations("Clubs"),
    p = useTranslations("Practice"),
    info = useTranslations("CoachInformation");
  const [saved, setSaved] = useSavedCoach(username);
  const router = useRouter();
  if (!query.data)
    return (
      <CatalogState
        loading={query.isPending}
        missing={query.error?.status === 404}
        retry={query.isError ? () => void query.refetch() : undefined}
      />
    );
  const coach = query.data;
  const rating = coach.reviews.length
    ? coach.reviews.reduce((sum, review) => sum + review.rating, 0) /
      coach.reviews.length
    : 0;
  return (
    <CoachDetail
      samples={
        coach.credentialVerified && coach.publicId ? <CoachSamples username={coach.publicId} /> : undefined
      }
      services={
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{p("services")}</h2>
          {!coach.services.length && (
            <p className="text-sm leading-7 text-muted-foreground">
              {info("noServices")}
            </p>
          )}
          {coach.services.map((service) => (
            <article
              key={service.serviceId}
              data-zoom-exit-key={`class-${service.serviceId}`}
              className="space-y-3 rounded-3xl bg-muted/50 p-5"
            >
              <h3 className="text-lg font-semibold">{service.title}</h3>
              <p className="text-sm text-muted-foreground">
                {p(
                  service.mode === "semi_private"
                    ? "semiPrivate"
                    : service.mode === "online"
                      ? "online"
                      : service.mode === "introduction"
                        ? "introduction"
                        : "private",
                )}
              </p>
              <p className="text-sm">
                {[service.clubName, service.branchName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="font-semibold">
                <PracticeMoney value={service.amountMinor} />
              </p>
              {service.entryAmountMinor !== "0" && (
                <p className="text-xs text-muted-foreground">
                  {p("entryIncluded")}:{" "}
                  <PracticeMoney value={service.entryAmountMinor} />
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {p(
                  service.approvalRequired
                    ? "requestPendingHint"
                    : "directConfirmation",
                )}
              </p>
              {service.publicId && (
                <Button asChild variant="secondary">
                  <Link href={serviceHref(service.publicId)}>
                    {p("bookService")}
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </section>
      }
      reviews={
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {p("reviews")}{" "}
            <span className="text-base text-muted-foreground">
              ({new Intl.NumberFormat(locale).format(coach.reviews.length)})
            </span>
          </h2>
          {!coach.reviews.length && (
            <p className="text-sm text-muted-foreground">{p("noReviews")}</p>
          )}
          {coach.reviews.map((review) => (
            <article
              key={review.id}
              className="space-y-3 rounded-3xl bg-muted/50 p-5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <StarFullIcon className="text-primary" />
                {new Intl.NumberFormat(locale).format(review.rating)} /{" "}
                {new Intl.NumberFormat(locale).format(5)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-8">
                {review.body}
              </p>
              {review.example && (
                <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                  {review.example}
                </p>
              )}
              <ReviewReactions kind="coach" reviewId={review.id} />
              {review.reply && (
                <blockquote className="space-y-1 border-s-2 border-primary ps-4">
                  <p className="text-xs font-semibold">{p("coachReply")}</p>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {review.reply}
                  </p>
                </blockquote>
              )}
            </article>
          ))}
        </section>
      }
      coach={{
        id: coach.publicId,
        name: coach.displayName ?? "",
        specialty: coach.specialties.join(" · "),
        specialties: coach.specialties,
        goals: coach.goals,
        priceLabel: coach.fromPriceMinor
          ? `${amount(coach.fromPriceMinor, locale)} ${p("toman")}`
          : undefined,
        rating,
        reviews: coach.reviews.length,
        yearsOfExperience: coach.experienceYears,
        certified: coach.credentialVerified ?? Boolean(coach.reviewExpiresAt),
        clubId: "",
        clubName: coach.services[0]?.clubName ?? "",
        location: coach.city,
        description: coach.biography ?? "",
        photos: [
          { src: "/images/club-placeholder.svg", alt: coach.displayName ?? "" },
        ],
      }}
      locale={locale}
      saved={saved}
      onSavedChange={setSaved}
      onBook={
        coach.services[0]?.publicId
          ? () => router.push(serviceHref(coach.services[0]!.publicId))
          : undefined
      }
      onShare={() =>
        void (async () => {
          try {
            if (navigator.share)
              await navigator.share({
                title: coach.displayName ?? "",
                url: window.location.href,
              });
            else {
              await navigator.clipboard.writeText(window.location.href);
              toast.success(clubs("copied"));
            }
          } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError"))
              toast.error(clubs("shareFailed"));
          }
        })()
      }
      labels={{
        back: t("back"),
        save: c("save"),
        unsave: c("unsave"),
        gallery: t("gallery"),
        photo: t("photo"),
        about: t("about"),
        club: t("club"),
        rating: c("rating"),
        experience: c("experience"),
        certified: c("certified"),
        book: p("bookService"),
        share: t("share"),
      }}
    />
  );
}
