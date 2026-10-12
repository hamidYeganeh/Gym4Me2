import { notFound } from "next/navigation";
import { clubIds } from "../../../../lib/clubs";
import { getCoaches } from "../../../../lib/coaches";
import { CoachPage } from "../../../../components/discovery/coach-page";
const coachIds = clubIds.flatMap((clubId) =>
  getCoaches("fa", clubId).map((coach) => coach.id),
);
export const dynamicParams = false;
export function generateStaticParams() {
  return coachIds.map((coachId) => ({ coachId }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ coachId: string }>;
}) {
  const { coachId } = await params;
  if (!coachIds.includes(coachId)) notFound();
  return <CoachPage coachId={coachId} />;
}
