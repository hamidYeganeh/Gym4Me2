/** A definitive denial retires cached public data; a temporary outage can retain it. */
export function availableCatalogData<T>(
  data: T | undefined,
  error: { status: number } | null,
): T | undefined {
  return error?.status === 403 || error?.status === 404 ? undefined : data;
}
