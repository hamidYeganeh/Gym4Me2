import { redirect } from "next/navigation";
import { ClubReservation } from "../../../../../components/discovery/club-reservation";
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
  if (clubId !== club.slug || (await searchParams).branch)
    redirect(`/discovery/clubs/${club.slug}/slots`);
  return <ClubReservation initialClub={club} clubId={club.slug} />;
}
