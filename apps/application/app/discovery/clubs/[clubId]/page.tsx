import type { Metadata } from "next";
import { getLocale } from "@repo/i18n/server";
import { getClubs } from "../../../../lib/clubs";
import { notFound } from "next/navigation";
import { clubIds } from "../../../../lib/clubs";
import { ClubPage } from "../../../../components/discovery/club-page";
export const dynamicParams = false;
export function generateStaticParams() {
  return clubIds.map((clubId) => ({ clubId }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubId: string }>;
}): Promise<Metadata> {
  const { clubId } = await params;
  const locale = (await getLocale()) === "fa" ? "fa" : "en";
  const club = getClubs(locale).find((item) => item.id === clubId);
  if (!club) return {};
  const title = `${club.name} | Gym4Me`;
  const image = {
    url: `/images/og/${club.id}-${locale}.png`,
    width: 1200,
    height: 630,
    alt: `${club.name} · ${club.category}`,
    type: "image/png",
  };
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:7081",
    ),
    title,
    description: club.description,
    openGraph: {
      title,
      description: club.description,
      url: `/discovery/clubs/${club.id}`,
      siteName: "Gym4Me",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: club.description,
      images: [image.url],
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  if (!clubIds.some((id) => id === clubId)) notFound();
  return <ClubPage clubId={clubId} />;
}
