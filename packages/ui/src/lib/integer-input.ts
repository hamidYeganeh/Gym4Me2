/** Bound a count before using it for price calculations or participant rows. */
export function boundedCount(value: string | number, maximum: number) {
  return Math.trunc(Math.min(maximum, Math.max(1, Number(value) || 1)));
}
