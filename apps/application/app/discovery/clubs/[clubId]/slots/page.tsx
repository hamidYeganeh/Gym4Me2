import { ServicesPage } from "../../../../../components/luma/services";
import { clubHref } from "../../../../../lib/club-href";
import { getPublicClub } from "../../../../../lib/public-catalog";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { clubId } = await params;
  await getPublicClub(clubId);
  const { branch } = await searchParams;
  return (
    <ServicesPage
      organizationId={clubId}
      branchId={branch}
      back={clubHref(clubId, undefined, branch ? { branch } : undefined)}
    />
  );
}
