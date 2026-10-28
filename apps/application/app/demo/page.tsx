import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "دمو | Gym4Me",
  robots: { index: false, follow: false },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { DemoGallery } = await import("../../components/demo/demo-gallery");
  const category = (await searchParams)?.category;
  return <DemoGallery key={category} initialCategory={category} />;
}
