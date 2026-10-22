import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSelectOptions,
  pageSelectOptions,
  mergeSelectOptions,
  normalizeOptionSearch,
} from "../src/select-options-model";
import { catalogSelectSource } from "../src/catalog/select-options";
import { createApiClient } from "../src/transport";

const options = Array.from({ length: 137 }, (_, n) => ({
  value: `movement-${n + 1}`,
  label: `Movement ${n + 1}`,
  subtitle: n === 136 ? "قدرت بالاتنه" : "Strength",
  keywords: "gym",
  group: "Training",
}));
test("search includes entries beyond the first page and matches subtitles, keywords, and multi-word queries", () => {
  assert.equal(
    filterSelectOptions(options, "movement 137")[0]?.value,
    "movement-137",
  );
  assert.equal(
    filterSelectOptions(options, "بالاتنه")[0]?.value,
    "movement-137",
  );
  assert.equal(filterSelectOptions(options, "gym training").length, 137);
  assert.deepEqual(filterSelectOptions(options, "missing"), []);
});
test("search normalizes Arabic/Persian letters, diacritics, accents, casing, and zero-width spaces", () => {
  const choices = [{ value: "one", label: "كلاس يک‌شنبه Café" }];
  assert.equal(filterSelectOptions(choices, "کلاس یک شنبه CAFE").length, 1);
  assert.equal(normalizeOptionSearch("  A  B "), "a b");
});
test("controlled pages return every option once and stop on a partial or empty final page", () => {
  let page: number | undefined = 1;
  const pages = [];
  while (page) {
    const result: { items: typeof options; nextPage: number | undefined } =
      pageSelectOptions(options, page, 25);
    pages.push(result);
    page = result.nextPage;
  }
  assert.deepEqual(
    pages.map((p) => p.items.length),
    [25, 25, 25, 25, 25, 12],
  );
  assert.equal(mergeSelectOptions(pages).length, 137);
  assert.equal(pageSelectOptions([], 1, 25).nextPage, undefined);
  assert.equal(
    pageSelectOptions(options.slice(0, 25), 1, 25).nextPage,
    undefined,
  );
  assert.equal(
    pageSelectOptions(filterSelectOptions(options, "137"), 1, 25).items[0]
      ?.value,
    "movement-137",
  );
});
test("overlapping server pages preserve row identity without duplicate options", () => {
  assert.equal(
    mergeSelectOptions([
      { items: options.slice(0, 25) },
      { items: options.slice(20, 50) },
    ]).length,
    50,
  );
});
test("catalog pickers pass search, scope, bounded size, and explicit pages to the server", async () => {
  const calls: URL[] = [];
  const api = createApiClient({
    application: "application",
    locale: "en",
    fetch: async (url) => {
      const parsed = new URL(String(url), "https://fixture.invalid");
      calls.push(parsed);
      return Response.json(
        Array.from(
          { length: parsed.searchParams.get("page") === "1" ? 25 : 2 },
          (_, n) => ({ id: `place-${n}`, name: `Place ${n}` }),
        ),
      );
    },
  });
  const source = catalogSelectSource("cities", "parent");
  const signal = new AbortController().signal;
  const first = await source.loadPage(api, {
    search: "tehran",
    page: 1,
    pageSize: 25,
    signal,
  });
  const second = await source.loadPage(api, {
    search: "tehran",
    page: 2,
    pageSize: 25,
    signal,
  });
  assert.equal(first.nextPage, 2);
  assert.equal(second.nextPage, undefined);
  assert.equal(calls[0]?.pathname, "/api/v1/catalog/locations/cities");
  assert.equal(calls[0]?.searchParams.get("parentId"), "parent");
  assert.equal(calls[0]?.searchParams.get("search"), "tehran");
  assert.equal(calls[0]?.searchParams.get("limit"), "25");
  assert.equal(calls[1]?.searchParams.get("page"), "2");
});
test("resolving a saved selection does not download the whole location list", async () => {
  const id = "a1000000-0000-4000-8000-000000000001";
  const api = createApiClient({
    application: "application",
    locale: "en",
    fetch: async (url) => {
      const query = new URL(String(url), "https://fixture.invalid")
        .searchParams;
      assert.equal(query.get("id"), id);
      assert.equal(query.get("limit"), "1");
      return Response.json([{ id, name: "Saved city" }]);
    },
  });
  const rows = await catalogSelectSource("cities", "parent").resolve!(
    api,
    [id],
    new AbortController().signal,
  );
  assert.equal(rows[0]?.label, "Saved city");
});
