import type { DocumentDto } from "@repo/api/sports";

export const documentFileLimit = 5 * 1024 * 1024;
export const documentFileAccept =
  "image/jpeg,image/png,image/webp,application/pdf";
const types = new Set(documentFileAccept.split(","));

/** Metadata checks improve feedback; the server still inspects file contents. */
export function documentFileIssue(file: Pick<File, "size" | "type">) {
  if (file.size === 0) return "documentFileEmpty";
  if (file.size > documentFileLimit) return "documentFileTooLarge";
  if (!types.has(file.type)) return "documentFileTypeInvalid";
  return null;
}

export function documentStatus(
  document: Pick<DocumentDto, "status" | "expiresAt">,
  now = Date.now(),
): DocumentDto["status"] {
  return document.expiresAt && Date.parse(document.expiresAt) <= now
    ? "expired"
    : document.status;
}
