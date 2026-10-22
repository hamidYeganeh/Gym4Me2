export type SearchableOption = {
  value: string;
  label: string;
  subtitle?: string;
  keywords?: string;
  group?: string;
  disabled?: boolean;
};
export function normalizeOptionSearch(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ي|ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹٠-٩]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10),
    )
    .replace(/[\u200c\u200d]/g, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
export function filterSelectOptions<T extends SearchableOption>(
  items: T[],
  search: string,
): T[] {
  const words = normalizeOptionSearch(search).split(" ").filter(Boolean);
  return items.filter((item) => {
    const haystack = normalizeOptionSearch(
      [item.label, item.subtitle, item.keywords, item.group, item.value]
        .filter(Boolean)
        .join(" "),
    );
    return words.every((word) => haystack.includes(word));
  });
}
export function pageSelectOptions<T>(
  items: T[],
  page: number,
  pageSize: number,
) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    nextPage: start + pageSize < items.length ? page + 1 : undefined,
  };
}
export function mergeSelectOptions<T extends { value: string }>(
  pages: { items: T[] }[],
): T[] {
  const unique = new Map<string, T>();
  for (const page of pages)
    for (const item of page.items)
      if (!unique.has(item.value)) unique.set(item.value, item);
  return [...unique.values()];
}
