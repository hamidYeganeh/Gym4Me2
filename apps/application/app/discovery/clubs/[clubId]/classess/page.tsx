import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ServicesPage } from "../../../../../components/luma/services";
import { PageLoading } from "../../../../../components/luma/page-loading";
import { getPublicClub } from "../../../../../lib/public-catalog";
import { clubClassPath } from "../../../../../lib/club-class-route";
export default async function Page({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const club = await getPublicClub(clubId);
  if (clubId !== club.slug) redirect(clubClassPath(club.slug));
  return <Suspense fallback={<PageLoading />}><ServicesPage organizationId={club.id} fixedKind="class" clubSlug={club.slug} clubName={club.name} back={`/discovery/clubs/${club.slug}`} /></Suspense>;
}
