import { allocate, coachEarning, type Rule } from './ph5.math';
import { sharedSchema, statementSchema } from './ph5.contracts';
const rule: Rule = {
  mode: 'percentage',
  amountMinor: '0',
  shareBps: 5000,
  discountPayer: 'shared',
  spaceMinor: '100',
  platformBps: 1000,
  basis: 'net',
};
describe('PH5 financial rules', () => {
  it('subtracts explicit space and platform costs before a net share', () =>
    expect(coachEarning('1000', '800', rule)).toBe('310'));
  it('the business can bear discounts without changing gross evidence', () =>
    expect(
      coachEarning('1000', '800', { ...rule, discountPayer: 'business' }),
    ).toBe('400'));
  it('gross basis retains contract share without net costs', () =>
    expect(coachEarning('1000', '800', { ...rule, basis: 'gross' })).toBe(
      '400',
    ));
  it('does not create negative earnings when costs exceed collections', () =>
    expect(coachEarning('50', '20', rule)).toBe('0'));
  it('per-session rules use the agreed amount, without floating point', () =>
    expect(
      coachEarning('0', '0', {
        ...rule,
        mode: 'per_session',
        amountMinor: '99999999999999',
      }),
    ).toBe('99999999999999'));
  it('preserves high-value precision', () =>
    expect(
      coachEarning('99999999999999', '99999999999999', {
        ...rule,
        basis: 'gross',
        shareBps: 9999,
      }),
    ).toBe('99989999999999'));
  it('allocations preserve every minor unit with stable branch ordering', () => {
    const a = allocate('101', [
      { branchId: 'b', basisPoints: 5000 },
      { branchId: 'a', basisPoints: 5000 },
    ]);
    expect(a.map((v) => v.amountMinor)).toEqual(['50', '51']);
    expect(a.reduce((n, v) => n + BigInt(v.amountMinor), 0n)).toBe(101n);
  });
  it('rejects duplicate branches and incomplete weights', () => {
    expect(() =>
      allocate('100', [{ branchId: 'a', basisPoints: 9000 }]),
    ).toThrow();
    expect(() =>
      allocate('100', [
        { branchId: 'a', basisPoints: 5000 },
        { branchId: 'a', basisPoints: 5000 },
      ]),
    ).toThrow();
  });
  it('requires bounded, closed date ranges', () =>
    expect(
      statementSchema.safeParse({
        idempotencyKey: 'test-key',
        organizationId: crypto.randomUUID(),
        branchId: crypto.randomUUID(),
        coachId: crypto.randomUUID(),
        from: '2026-10-20',
        to: '2026-10-01',
      }).success,
    ).toBe(false));
  it('scope allocation validates exact weights before any database command', () =>
    expect(
      sharedSchema.safeParse({
        idempotencyKey: 'test-key',
        membershipId: crypto.randomUUID(),
        revision: 1,
        services: [crypto.randomUUID()],
        allocations: [{ branchId: crypto.randomUUID(), basisPoints: 9999 }],
        reason: 'Testing allocation',
      }).success,
    ).toBe(false));
  it('never allocates rounding remainder to a zero-weight branch', () =>
    expect(
      allocate('101', [
        { branchId: 'a', basisPoints: 5000 },
        { branchId: 'b', basisPoints: 5000 },
        { branchId: 'z', basisPoints: 0 },
      ]).map((a) => a.amountMinor),
    ).toEqual(['50', '51', '0']));
});
