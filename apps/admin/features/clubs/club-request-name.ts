export function clubRequestName(profile: { title?: string | null; name?: string | null }) {
  return profile.title?.trim() || profile.name?.trim() || "";
}
