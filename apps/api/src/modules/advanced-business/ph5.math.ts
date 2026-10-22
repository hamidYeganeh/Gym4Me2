export type Rule = {
  mode: 'percentage' | 'per_session' | 'fixed';
  amountMinor: string;
  shareBps: number;
  discountPayer: 'shared' | 'business';
  spaceMinor: string;
  platformBps: number;
  basis: 'gross' | 'net';
};
export function coachEarning(
  gross: string,
  collected: string,
  rule: Rule,
): string {
  const base = BigInt(rule.discountPayer === 'business' ? gross : collected);
  if (rule.mode !== 'percentage') return rule.amountMinor;
  const deductible =
    rule.basis === 'net'
      ? BigInt(rule.spaceMinor) + (base * BigInt(rule.platformBps)) / 10000n
      : 0n;
  const eligible = base > deductible ? base - deductible : 0n;
  return ((eligible * BigInt(rule.shareBps)) / 10000n).toString();
}
export function allocate(
  amount: string,
  weights: { branchId: string; basisPoints: number }[],
) {
  const sorted = [...weights].sort((a, b) =>
    a.branchId.localeCompare(b.branchId),
  );
  if (
    !sorted.length ||
    new Set(sorted.map((a) => a.branchId)).size !== sorted.length ||
    sorted.some(
      (a) =>
        !Number.isInteger(a.basisPoints) ||
        a.basisPoints < 0 ||
        a.basisPoints > 10000,
    ) ||
    sorted.reduce((n, a) => n + a.basisPoints, 0) !== 10000
  )
    throw new Error('PH5.invalidAllocation');
  const total = BigInt(amount);
  if (total < 0n) throw new Error('PH5.invalidAllocation');
  const last = sorted.findLastIndex((a) => a.basisPoints > 0);
  let remaining = total;
  return sorted.map((a, i) => {
    const part =
      a.basisPoints === 0
        ? 0n
        : i === last
          ? remaining
          : (total * BigInt(a.basisPoints)) / 10000n;
    remaining -= part;
    return { ...a, amountMinor: part.toString() };
  });
}
