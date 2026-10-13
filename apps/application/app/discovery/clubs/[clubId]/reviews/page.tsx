import { ClubReviews } from "../../../../../components/discovery/club-reviews";
import { getPublicClub } from "../../../../../lib/public-catalog";
export default async function Page({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  await getPublicClub(clubId);
  return <ClubReviews clubId={clubId} full />;
}
