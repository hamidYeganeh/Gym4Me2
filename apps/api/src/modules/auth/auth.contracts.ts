import { BadRequestException, applyDecorators } from '@nestjs/common';
import { ApiBody, ApiHeader } from '@nestjs/swagger';
import { z } from 'zod';

export const clientSchema = z.enum(['application', 'business', 'admin']);
export type Client = z.infer<typeof clientSchema>;
export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (n) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n)));
}
export const phoneSchema = z
  .string()
  .transform((v) =>
    normalizeDigits(v)
      .replace(/[\s()-]/g, '')
      .replace(/^0098/, '+98')
      .replace(/^09/, '+989'),
  )
  .pipe(z.string().regex(/^\+989\d{9}$/, 'شماره موبایل معتبر وارد کنید.'));
export const requestOtpSchema = z.object({ phone: phoneSchema }).strict();
export const verifyOtpSchema = z
  .object({
    challengeId: z.uuid(),
    code: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{5}$/)),
  })
  .strict();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new BadRequestException('اطلاعات واردشده معتبر نیست.');
  return parsed.data;
}
export const ClientHeader = () =>
  ApiHeader({
    name: 'x-gym-client',
    required: true,
    enum: ['application', 'business', 'admin'],
  });
export const JsonBody = (
  properties: Record<
    string,
    { type: string; enum?: string[]; example?: string }
  >,
  required = Object.keys(properties),
) =>
  applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
      },
    }),
  );
