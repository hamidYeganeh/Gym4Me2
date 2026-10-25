import { randomUUID } from 'node:crypto';
import {
  bookingPageSchema,
  decodeBookingCursor,
  encodeBookingCursor,
} from './booking-page';

test('calendar requests accept real ISO days and reject invalid dates', () => {
  expect(bookingPageSchema.parse({ day: '2024-02-29' }).day).toBe('2024-02-29');
  expect(bookingPageSchema.safeParse({ day: '2026-02-29' }).success).toBe(
    false,
  );
  expect(bookingPageSchema.safeParse({ day: '2026-13-01' }).success).toBe(
    false,
  );
});
test('booking cursors remain bound to the account, tab and selected calendar day', () => {
  const userId = randomUUID();
  const cursor = encodeBookingCursor({
    userId,
    tab: 'past',
    day: '2026-10-24',
    asOf: '2026-10-25T12:00:00Z',
    startAt: '2026-10-24T12:00:00Z',
    id: randomUUID(),
  });
  expect(decodeBookingCursor(cursor, userId, 'past', '2026-10-24').day).toBe(
    '2026-10-24',
  );
  expect(() =>
    decodeBookingCursor(cursor, userId, 'past', '2026-10-25'),
  ).toThrow('Backend.invalidBookingCursor');
  expect(() => decodeBookingCursor(cursor, userId, 'past')).toThrow(
    'Backend.invalidBookingCursor',
  );
  expect(() =>
    decodeBookingCursor(cursor, randomUUID(), 'past', '2026-10-24'),
  ).toThrow('Backend.invalidBookingCursor');
  expect(() =>
    decodeBookingCursor(cursor, userId, 'upcoming', '2026-10-24'),
  ).toThrow('Backend.invalidBookingCursor');
});
test('existing unfiltered cursor tokens still work', () => {
  const userId = randomUUID();
  const cursor = encodeBookingCursor({
    userId,
    tab: 'upcoming',
    asOf: '2026-10-24T12:00:00Z',
    startAt: '2026-10-25T12:00:00Z',
    id: randomUUID(),
  });
  expect(decodeBookingCursor(cursor, userId, 'upcoming').day).toBeUndefined();
});
