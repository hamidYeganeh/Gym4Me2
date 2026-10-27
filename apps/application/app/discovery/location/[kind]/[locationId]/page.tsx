import { notFound } from "next/navigation";
import { LocationPage } from "../../../../../components/discovery/location-page";
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; locationId: string }>;
}) {
  const { kind, locationId } = await params;
  if (kind !== "provinces" && kind !== "cities" && kind !== "districts")
    notFound();
  return <LocationPage kind={kind} locationId={locationId} />;
}
