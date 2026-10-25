import { entry, nutrients } from './nutrition.contracts';
describe('nutrition label calculations', () => {
  it('scales each label value to the consumed grams without deriving calories from macros', () => {
    expect(
      nutrients(150, { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }),
    ).toEqual({ calories: 195, protein: 4.05, carbs: 42.3, fat: 0.45 });
  });
  it('rejects unknown, missing, nonfinite or negative label values', () => {
    const value = {
      operationId: 'ac8641a9-9d87-4499-b19a-01f6a243427e',
      eatenOn: '2026-10-24',
      meal: 'lunch',
      name: 'Label test',
      grams: 150,
      per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    };
    expect(entry.safeParse(value).success).toBe(true);
    expect(entry.safeParse({ ...value, grams: 0 }).success).toBe(false);
    expect(entry.safeParse({ ...value, grams: NaN }).success).toBe(false);
    expect(entry.safeParse({ ...value, eatenOn: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      entry.safeParse({ ...value, per100g: { ...value.per100g, fat: -1 } })
        .success,
    ).toBe(false);
    expect(
      entry.safeParse({ ...value, per100g: { calories: 130 } }).success,
    ).toBe(false);
  });
});
