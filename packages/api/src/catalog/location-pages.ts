import { ApiError } from "../transport";
import type { GeographyKind, PlaceDto } from "./catalog.dto";
import { readNumberedPages } from "../paged-list";

/** Existing selectors require a complete list, never a silently truncated page. */
export async function readLocationPages(
  kind: GeographyKind,
  load: (page: number) => Promise<PlaceDto[]>,
  signal?: AbortSignal,
): Promise<PlaceDto[]> {
  return readNumberedPages(
    kind === "countries" ? 300 : 1000,
    async (page) => {
      const rows = await load(page);
      if (
        !Array.isArray(rows) ||
        rows.some((row) => !row || typeof row.name !== "string")
      )
        throw new ApiError(502, "Errors.invalidResponse");
      return rows;
    },
    signal,
  );
}
