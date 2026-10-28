/** Match the server's booking entry window; the server still authorizes issuance. */
export function ticketWindow(startAt: string, endAt: string, now: number) {
  const opensAt = Date.parse(startAt) - 2 * 60 * 60 * 1000;
  const endsAt = Date.parse(endAt);
  return {
    opensAt,
    available: now >= opensAt && now <= endsAt,
    upcoming: now < opensAt,
  };
}
