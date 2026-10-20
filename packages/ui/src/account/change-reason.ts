export type ChangeReasonError = "AuditReason.tooShort" | "AuditReason.tooLong";

export function changeReasonError(
  value: string,
): ChangeReasonError | undefined {
  const length = value.trim().length;
  if (length < 3) return "AuditReason.tooShort";
  if (length > 500) return "AuditReason.tooLong";
}
