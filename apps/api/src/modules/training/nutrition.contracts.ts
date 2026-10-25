import { z } from 'zod';
const decimal = (max: number) =>
  z.number().finite().min(0).max(max).multipleOf(0.01);
export const entry = z
  .object({
    operationId: z.uuid(),
    eatenOn: z.iso.date(),
    meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    name: z.string().trim().min(1).max(160),
    grams: decimal(20000).refine((v) => v > 0),
    per100g: z
      .object({
        calories: decimal(1000),
        protein: decimal(100),
        carbs: decimal(100),
        fat: decimal(100),
      })
      .strict(),
  })
  .strict();
export const remove = z
  .object({ operationId: z.uuid(), revision: z.number().int().positive() })
  .strict();
export const day = z.object({ date: z.iso.date() }).strict();
export const foodQuery = z
  .object({
    q: z.string().trim().max(160).default(''),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
export const foodEntry = z
  .object({
    operationId: z.uuid(),
    eatenOn: z.iso.date(),
    meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    grams: decimal(20000).refine((v) => v > 0),
    locale: z.enum(['fa', 'en']),
  })
  .strict();
export function nutrients(
  grams: number,
  per100g: z.infer<typeof entry>['per100g'],
) {
  return Object.fromEntries(
    Object.entries(per100g).map(([key, value]) => [
      key,
      Math.round(grams * value) / 100,
    ]),
  ) as Record<keyof z.infer<typeof entry>['per100g'], number>;
}
