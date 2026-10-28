import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GlobalError,
  RouteError,
  NotFound,
} from "../../../packages/ui/src/recovery";

test("page and root recovery render without API, locale or theme providers", () => {
  for (const Component of [RouteError, GlobalError]) {
    const html = renderToStaticMarkup(
      createElement(Component, {
        error: new Error("sensitive-internal-diagnostics"),
        retry: () => {},
      }),
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /<button/);
    assert.match(html, /href="\/"/);
    assert.doesNotMatch(html, /sensitive-internal-diagnostics/);
  }
});

test("root errors replace the document and missing pages offer a real way home", () => {
  const root = renderToStaticMarkup(
    createElement(GlobalError, { error: null, retry: () => {} }),
  );
  assert.match(root, /<html lang="fa" dir="rtl">/);
  assert.match(root, /<body/);
  const missing = renderToStaticMarkup(createElement(NotFound));
  assert.match(missing, /href="\/"/);
  assert.doesNotMatch(missing, /<button/);
});
