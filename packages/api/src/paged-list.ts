import { ApiError } from "./transport";

/** Collect an existing array contract without silently returning partial data. */
export async function readNumberedPages<T extends { id: string }>(
  pageSize: number,
  load: (page: number) => Promise<T[]>,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 100000; page++) {
    signal?.throwIfAborted();
    const rows = await load(page);
    signal?.throwIfAborted();
    if (!Array.isArray(rows) || rows.length > pageSize)
      throw new ApiError(502, "Errors.invalidResponse");
    for (const row of rows) {
      if (!row || typeof row.id !== "string" || seen.has(row.id))
        throw new ApiError(502, "Errors.invalidResponse");
      seen.add(row.id);
      items.push(row);
    }
    if (rows.length < pageSize) return items;
  }
  throw new ApiError(502, "Errors.invalidResponse");
}
