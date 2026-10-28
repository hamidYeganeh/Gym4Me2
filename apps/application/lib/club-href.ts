export function clubHref(
  id: string,
  view?: "gallery" | "reviews" | "slots",
  query?: Record<string, string>,
) {
  const params = new URLSearchParams(query);
  params.delete("branch");
  if (process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true") {
    params.set("id", id);
    if (view) params.set("view", view);
    return `/discovery/club?${params}`;
  }
  const path = `/discovery/clubs/${encodeURIComponent(id)}${view ? `/${view}` : ""}`;
  return `${path}${params.size ? `?${params}` : ""}`;
}
