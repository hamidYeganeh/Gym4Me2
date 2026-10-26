import assert from "node:assert/strict";
import test from "node:test";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/transport";
import { clubFeedOptions } from "../src/catalog/catalog-feed";

test("club feed appends pages, ends on a short page, and resets for a different filter", async () => {
  const requests: string[] = [];
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: "https://example.test/api",
    fetch: async (input) => {
      const url = new URL(String(input));
      requests.push(url.search);
      const page = Number(url.searchParams.get("page"));
      const search = url.searchParams.get("search");
      const count = search ? 1 : page === 1 ? 25 : 2;
      return Response.json(
        Array.from({ length: count }, (_, i) => ({
          id: `${search ?? "all"}-${page}-${i}`,
        })),
      );
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const observer = new InfiniteQueryObserver(client, clubFeedOptions(api));
  try {
    await observer.refetch();
    assert.equal(observer.getCurrentResult().hasNextPage, true);
    await observer.fetchNextPage();
    assert.equal(observer.getCurrentResult().data?.pages.flat().length, 27);
    assert.equal(observer.getCurrentResult().hasNextPage, false);
    observer.setOptions(clubFeedOptions(api, { search: "studio" }));
    await observer.refetch();
    assert.equal(observer.getCurrentResult().data?.pages.flat().length, 1);
    assert.match(requests.at(-1)!, /search=studio.*page=1/);
    assert.deepEqual(observer.getCurrentResult().data?.pageParams, [1]);
  } finally {
    observer.destroy();
    client.clear();
  }
});

test("a failed next page retains loaded clubs and retries the same page", async () => {
  let fail = true;
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: "https://example.test/api",
    fetch: async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      if (page === 2 && fail)
        return Response.json({ code: "unavailable" }, { status: 503 });
      return Response.json(
        Array.from({ length: page === 1 ? 25 : 1 }, (_, i) => ({
          id: `${page}-${i}`,
        })),
      );
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const observer = new InfiniteQueryObserver(client, clubFeedOptions(api));
  try {
    await observer.refetch();
    await observer.fetchNextPage();
    assert.equal(observer.getCurrentResult().isFetchNextPageError, true);
    assert.equal(observer.getCurrentResult().data?.pages.flat().length, 25);
    fail = false;
    await observer.fetchNextPage();
    assert.deepEqual(observer.getCurrentResult().data?.pageParams, [1, 2]);
    assert.equal(observer.getCurrentResult().data?.pages.flat().length, 26);
  } finally {
    observer.destroy();
    client.clear();
  }
});
