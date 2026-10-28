import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ServiceDetail } from "../../../../../../components/luma/services";
import { PageLoading } from "../../../../../../components/luma/page-loading";
import { getPublicClubClass } from "../../../../../../lib/public-catalog";
import { clubClassPath } from "../../../../../../lib/club-class-route";
export default async function Page({ params }: { params: Promise<{ clubId: string; classId: string }> }) {
  const { clubId, classId } = await params;
  const { club, service } = await getPublicClubClass(clubId, classId);
  if (clubId !== club.slug || classId !== service.publicId) redirect(clubClassPath(club.slug, service.publicId));
  return <Suspense fallback={<PageLoading />}><ServiceDetail initialService={service} serviceRef={service.publicId} back={clubClassPath(club.slug)} expectedClubId={club.id} /></Suspense>;
}
