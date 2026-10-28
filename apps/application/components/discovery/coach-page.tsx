"use client";
import { useRouter } from "next/navigation";
import { toast } from "@repo/ui/kit/Sileo";
import { useLocale, useTranslations } from "@repo/i18n";
import { CoachDetail } from "@repo/ui/kit/CoachDetail";
import { clubIds, getClubs } from "../../lib/clubs";
import { getCoaches } from "../../lib/coaches";
import { useSavedCoach } from "./use-saved-coach";
export function CoachPage({ coachId }: { coachId: string }) {
  const router = useRouter();
  const clubsCopy = useTranslations("Clubs");
  const locale = useLocale();
  const t = useTranslations("CoachDetail");
  const c = useTranslations("Coaches");
  const [saved, setSaved] = useSavedCoach(coachId);
  const clubId = clubIds.find((id) =>
    getCoaches(locale, id).some((coach) => coach.id === coachId),
  )!;
  const club = getClubs(locale).find((item) => item.id === clubId)!;
  const coach = getCoaches(locale, clubId).find((item) => item.id === coachId)!;
  return (
    <CoachDetail
      key={coachId}
      coach={{
        ...coach,
        clubId,
        clubName: club.name,
        location: club.address,
        photos: coach.photos ?? (coach.photo ? [coach.photo] : []),
        description: t("description"),
        specialties: [coach.specialty],
      }}
      locale={locale}
      saved={saved}
      onSavedChange={setSaved}
      onBook={() => router.push(`/services?coach=${encodeURIComponent(coachId)}`)}
      onShare={() => void (async () => {
        try {
          if (navigator.share) await navigator.share({ title: coach.name, url: window.location.href });
          else { await navigator.clipboard.writeText(window.location.href); toast.success(clubsCopy("copied")); }
        } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(clubsCopy("shareFailed")); }
      })()}
      labels={{
        book: clubsCopy("visit"),
        share: t("share"),
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
      }}
    />
  );
}
