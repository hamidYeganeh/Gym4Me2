export type LocationKind = "provinces" | "cities" | "districts";

export function isLocationKind(value: string | null): value is LocationKind {
  return value === "provinces" || value === "cities" || value === "districts";
}

export function locationHref(
  kind: LocationKind,
  id: string,
  native = process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true",
) {
  return native
    ? `/discovery/location?kind=${kind}&id=${encodeURIComponent(id)}`
    : `/discovery/location/${kind}/${encodeURIComponent(id)}`;
}
