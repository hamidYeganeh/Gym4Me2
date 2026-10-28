export function serviceHref(publicId: string) {
  return process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
    ? `/services/detail?id=${encodeURIComponent(publicId)}`
    : `/discovery/classes/${encodeURIComponent(publicId)}`;
}
export function coachHref(publicId: string) {
  return process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
    ? `/coaches/detail?id=${encodeURIComponent(publicId)}`
    : `/discovery/coaches/${encodeURIComponent(publicId)}`;
}
