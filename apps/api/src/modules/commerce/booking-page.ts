import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const bookingPageSchema = z
  .object({
    tab: z.enum(['upcoming', 'past']).default('upcoming'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z
      .string()
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
  })
  .strict();
export type BookingPageInput = z.infer<typeof bookingPageSchema>;
const cursorSchema = z
  .object({
    userId: z.uuid(),
    tab: z.enum(['upcoming', 'past']),
    asOf: z.iso.datetime({ offset: true }),
    startAt: z.iso.datetime({ offset: true }),
    id: z.uuid(),
  })
  .strict();
type BookingCursor = z.infer<typeof cursorSchema>;
export function decodeBookingCursor(
  value: string,
  userId: string,
  tab: BookingPageInput['tab'],
) {
  try {
    const cursor = cursorSchema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );
    if (cursor.userId !== userId || cursor.tab !== tab)
      throw new Error('Cursor scope changed');
    return cursor;
  } catch {
    throw new BadRequestException('Backend.invalidBookingCursor');
  }
}
export function encodeBookingCursor(cursor: BookingCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
