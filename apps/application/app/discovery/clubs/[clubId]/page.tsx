import { redirect } from "next/navigation";
import { ClubPage } from "../../../../components/discovery/club-page";
import type { Metadata } from "next";
import { getPublicClub, getPublicClubBranch } from "../../../../lib/public-catalog";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubId: string }>;
}): Promise<Metadata> {
  const { clubId } = await params;
  const club = await getPublicClub(clubId);
  const title = `${club.name} | Gym4Me`;
  const description = club.shortDescription ?? club.description ?? "";
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    title,
    description,
    ...(base
      ? {
          metadataBase: new URL(base),
          alternates: { canonical: `/discovery/clubs/${club.slug}` },
        }
      : {}),
    openGraph: {
      title,
      description,
      type: "website",
      ...(club.cover
        ? {
            images: [{ url: club.cover.url, alt: club.cover.alt ?? club.name }],
          }
        : {}),
    },
  };
}
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
    redirect(`/discovery/clubs/${club.slug}`);
  return <ClubPage clubId={clubId} initialClub={club} initialBranch={await getPublicClubBranch(clubId)} />;
}
