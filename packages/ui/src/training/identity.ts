/** An outage may retain the downloaded account; authoritative denial may not. */
export function trainingIdentity(
  accountId: string | undefined,
  cached: string,
  status?: number,
  offline = false,
): string {
  if (status && status >= 400 && status < 500 && status !== 429) return "";
  // A new account must finish retiring the previous account's storage first.
  if (accountId) return accountId === cached ? accountId : "";
  return offline ||
    status === 0 ||
    (status !== undefined && (status >= 500 || status === 429))
    ? cached
    : "";
}
