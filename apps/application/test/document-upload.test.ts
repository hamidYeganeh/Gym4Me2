import assert from "node:assert/strict";
import test from "node:test";
import { documentFileIssue, documentStatus } from "../lib/document-upload";

test("document uploads accept the four server-supported MIME types", () => {
  for (const type of [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ])
    assert.equal(documentFileIssue({ size: 1, type }), null);
});
test("the 5 MiB boundary is inclusive and one more byte is rejected", () => {
  assert.equal(
    documentFileIssue({ size: 5 * 1024 * 1024, type: "application/pdf" }),
    null,
  );
  assert.equal(
    documentFileIssue({ size: 5 * 1024 * 1024 + 1, type: "application/pdf" }),
    "documentFileTooLarge",
  );
});
test("empty and unsupported files have distinct useful errors", () => {
  assert.equal(
    documentFileIssue({ size: 0, type: "application/pdf" }),
    "documentFileEmpty",
  );
  for (const type of [
    "",
    "text/plain",
    "image/svg+xml",
    "application/octet-stream",
  ])
    assert.equal(
      documentFileIssue({ size: 10, type }),
      "documentFileTypeInvalid",
    );
});
test("an approved document becomes expired at the exact expiry instant", () => {
  const expiresAt = "2026-10-18T12:00:00Z";
  const document = { status: "approved" as const, expiresAt };
  assert.equal(documentStatus(document, Date.parse(expiresAt) - 1), "approved");
  assert.equal(documentStatus(document, Date.parse(expiresAt)), "expired");
  assert.equal(documentStatus(document, Date.parse(expiresAt) + 1), "expired");
});
test("unexpired review statuses are preserved", () => {
  for (const status of ["pending", "approved", "rejected", "expired"] as const)
    assert.equal(documentStatus({ status, expiresAt: null }, 0), status);
});
