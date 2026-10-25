import type { SelectOptionsSource } from "../select-options";
import type { GeographyKind, TaxonomyKind } from "./catalog.dto";
import type { QueryParams } from "../transport";
export type CatalogSelectOption = {
  value: string;
  label: string;
  subtitle?: string;
  keywords?: string;
  clubCount?: number;
};
/** Catalog endpoints honor a bounded limit, page, and global search. */
export function catalogSelectSource(
  kind: GeographyKind | TaxonomyKind,
  parentId?: string,
  admin = false,
): SelectOptionsSource<CatalogSelectOption> {
  const geography = ["countries", "provinces", "cities", "districts"].includes(
    kind,
  );
  const path = `${admin ? "admin" : "catalog"}/${geography ? "locations" : "taxonomies"}/${kind}`;
  const query: QueryParams = geography ? { parentId } : {};
  return {
    key: [path, query],
    async resolve(api, values, signal) {
      const rows = await Promise.all(
        values
          .filter((value) => /^[0-9a-f-]{36}$/i.test(value))
          .map((id) =>
            api.request<
              {
                id: string;
                name: string;
                description?: string | null;
                code?: string;
                clubCount?: number;
              }[]
            >(
              {
                method: "GET",
                path,
                query: { ...query, id, page: 1, limit: 1 },
              },
              { signal },
            ),
          ),
      );
      return rows.flat().map((row) => ({
        value: row.id,
        label: row.name,
        subtitle: row.description ?? row.code ?? undefined,
        clubCount: row.clubCount,
      }));
    },
    async loadPage(api, { search, page, pageSize, signal }) {
      const rows = await api.request<
        {
          id: string;
          name: string;
          description?: string | null;
          code?: string;
          clubCount?: number;
        }[]
      >(
        {
          method: "GET",
          path,
          query: { ...query, search, page, limit: pageSize },
        },
        { signal },
      );
      return {
        items: rows.map((row) => ({
          value: row.id,
          label: row.name,
          subtitle: row.description ?? row.code ?? undefined,
          clubCount: row.clubCount,
        })),
        nextPage: rows.length === pageSize ? page + 1 : undefined,
      };
    },
  };
}
