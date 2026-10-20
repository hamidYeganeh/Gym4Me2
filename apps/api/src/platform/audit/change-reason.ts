import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const changeReasonSchema = z.string().trim().min(3).max(500);
export const changeReasonBodySchema = z
  .object({ reason: changeReasonSchema })
  .strict();

/** Internal callers must satisfy the same policy as HTTP callers. */
export function checkedChangeReason(value: unknown) {
  const result = changeReasonSchema.safeParse(value);
  if (!result.success)
    throw new BadRequestException('Backend.changeReasonRequired');
  return result.data;
}
