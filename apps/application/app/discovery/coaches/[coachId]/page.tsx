import { getPublicCoach } from "../../../../lib/public-catalog";
import { PublicCoachPage } from "../../../../components/discovery/public-coach-page";
import { notFound } from "next/navigation";
import { clubIds } from "../../../../lib/clubs";
import { getCoaches } from "../../../../lib/coaches";
import { CoachPage } from "../../../../components/discovery/coach-page";
const coachIds = clubIds.flatMap((clubId) =>
  getCoaches("fa", clubId).map((coach) => coach.id),
);
export const dynamicParams = true;
export function generateStaticParams() {
  return coachIds.map((coachId) => ({ coachId }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ coachId: string }>;
}) {
  const { coachId } = await params;
  if (/^(coach|affiliate)-[a-f0-9]{32}$/.test(coachId)) return <PublicCoachPage username={coachId} initialCoach={await getPublicCoach(coachId)} />;
  if (!coachIds.includes(coachId)) notFound();
  return <CoachPage coachId={coachId} />;
}
