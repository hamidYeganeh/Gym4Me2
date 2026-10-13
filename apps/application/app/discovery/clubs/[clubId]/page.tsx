import { ClubPage } from "../../../../components/discovery/club-page";
import type { Metadata } from "next";
import { getPublicClub } from "../../../../lib/public-catalog";
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
          alternates: { canonical: `/discovery/clubs/${club.id}` },
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
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  await getPublicClub(clubId);
  return <ClubPage clubId={clubId} />;
}
