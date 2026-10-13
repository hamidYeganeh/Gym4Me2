import { ClubGallery } from "../../../../../components/discovery/club-gallery";
import { getPublicClub } from "../../../../../lib/public-catalog";
export default async function Page({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  await getPublicClub(clubId);
  return <ClubGallery clubId={clubId} />;
}
