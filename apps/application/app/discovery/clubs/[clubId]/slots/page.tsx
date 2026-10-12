import { notFound } from "next/navigation";
import { clubIds } from "../../../../../lib/clubs";
import { ClubSlots } from "../../../../../components/discovery/club-slots";
export const dynamicParams = false;
export function generateStaticParams() {
  return clubIds.map((clubId) => ({ clubId }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  if (!clubIds.some((id) => id === clubId)) notFound();
  return <ClubSlots clubId={clubId} />;
}
