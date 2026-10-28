/** A nested URL must not expose another club's class or a different service kind. */
export function belongsToClubClass(
  service: { organizationId: string; kind: string },
  clubId: string,
) {
  return service.organizationId === clubId && service.kind === "class";
}
export function clubClassPath(clubId: string, classId?: string) {
  if (process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true") {
    const query = new URLSearchParams(
      classId ? { id: classId } : { kind: "class", organizationId: clubId },
    );
    return `${classId ? "/services/detail" : "/services"}?${query}`;
  }
  return classId
    ? `/discovery/clubs/${encodeURIComponent(clubId)}/classess/${encodeURIComponent(classId)}`
    : `/club/${encodeURIComponent(clubId)}/classes`;
}
