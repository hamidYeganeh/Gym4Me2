import assert from "node:assert/strict";
import test from "node:test";
import DemoPage from "../app/demo/page";

test("the demo route returns not found outside development", async () => {
  assert.notEqual(process.env.NODE_ENV, "development");
  await assert.rejects(DemoPage({}), {
    digest: "NEXT_HTTP_ERROR_FALLBACK;404",
  });
});
