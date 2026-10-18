import assert from "node:assert/strict";
import test from "node:test";
import { isSupportReference, validateSupportDraft } from "../lib/support-form";

test("ticket validation applies the server's trimmed title and body limits", () => {
  assert.deepEqual(
    validateSupportDraft({ title: "   ", body: " \n " }, false),
    { title: "supportTitleLength", body: "supportDescriptionLength" },
  );
  assert.deepEqual(
    validateSupportDraft({ title: " عنوان ", body: " متن " }, false),
    {},
  );
  assert.equal(
    validateSupportDraft({ title: "a".repeat(161), body: "abc" }, false).title,
    "supportTitleLength",
  );
  assert.equal(
    validateSupportDraft({ title: "abc", body: "a".repeat(5001) }, false).body,
    "supportDescriptionLength",
  );
  assert.deepEqual(
    validateSupportDraft(
      { title: "a".repeat(160), body: "a".repeat(5000) },
      false,
    ),
    {},
  );
});
test("a reply accepts one trimmed character but rejects whitespace and oversized bodies", () => {
  assert.deepEqual(validateSupportDraft({ title: "", body: " ب " }, true), {});
  assert.equal(
    validateSupportDraft({ title: "", body: " \n " }, true).body,
    "supportReplyLength",
  );
  assert.equal(
    validateSupportDraft({ title: "", body: "a".repeat(5001) }, true).body,
    "supportReplyLength",
  );
});
test("support references reject malformed or non-RFC UUIDs", () => {
  assert.equal(
    isSupportReference("a1000000-0000-4000-8000-000000000001"),
    true,
  );
  for (const id of [
    "",
    "invalid",
    "a1000000-0000-0000-0000-000000000001",
    "a1000000-0000-4000-8000-000000000001?view=x",
  ])
    assert.equal(isSupportReference(id), false);
});
