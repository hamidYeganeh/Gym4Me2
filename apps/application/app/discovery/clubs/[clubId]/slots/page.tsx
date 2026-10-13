import { MobilePage } from "@repo/ui/mobile-page";
import { clubHref } from "../../../../../lib/club-href";
import { getTranslations } from "@repo/i18n/server";
import { getPublicClub } from "../../../../../lib/public-catalog";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { clubId } = await params;
  const club = await getPublicClub(clubId);
  const { branch } = await searchParams;
  const t = await getTranslations("Catalog");
  return (
    <MobilePage
      title={club.name}
      backHref={clubHref(club.id, undefined, branch ? { branch } : undefined)}
    >
      <p className="text-muted-foreground">{t("noBooking")}</p>
    </MobilePage>
  );
}
