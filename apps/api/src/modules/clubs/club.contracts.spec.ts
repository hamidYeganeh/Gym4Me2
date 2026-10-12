import { randomUUID } from 'node:crypto';
import {
  branchPatchSchema,
  clubCreateSchema,
  clubPatchSchema,
  openingHoursSchema,
  taxonomyPatchSchema,
  spacePatchSchema,
} from './club.contracts';
const id = randomUUID();
test('draft only requires a name and protects server-owned fields', () => {
  expect(clubCreateSchema.parse({ name: 'باشگاه آریا' })).toEqual({
    name: 'باشگاه آریا',
  });
  for (const field of [
    'ownerId',
    'publicationStatus',
    'verificationStatus',
    'serviceModes',
  ])
    expect(
      clubCreateSchema.safeParse({ name: 'باشگاه', [field]: id }).success,
    ).toBe(false);
  expect(clubCreateSchema.safeParse({}).success).toBe(false);
});
test('removed location and hours fields are rejected rather than silently stored', () => {
  for (const field of ['addressDetails', 'postalCode', 'directions'])
    expect(
      branchPatchSchema.safeParse({ location: { [field]: 'example' } }).success,
    ).toBe(false);
  expect(
    openingHoursSchema.safeParse({
      weekly: [
        { dayOfWeek: 0, startMinute: 600, endMinute: 900, spaceId: null },
      ],
    }).success,
  ).toBe(false);
});
test('optional text is nullable and arrays cannot contain duplicate references', () => {
  expect(
    clubPatchSchema.parse({
      shortDescription: null,
      gallery: [],
      categoryIds: [],
    }),
  ).toEqual({ shortDescription: null, gallery: [], categoryIds: [] });
  expect(clubPatchSchema.safeParse({ categoryIds: [id, id] }).success).toBe(
    false,
  );
  expect(
    branchPatchSchema.safeParse({
      equipments: [{ equipmentId: id }, { equipmentId: id }],
    }).success,
  ).toBe(false);
});
test('public phone strings are normalized and duplicate numbers are rejected', () => {
  expect(clubPatchSchema.parse({ phones: ['۰۲۱ ۱۲۳۴۵۶۷۸'] }).phones).toEqual([
    { number: '02112345678', isPrimary: false },
  ]);
  expect(
    clubPatchSchema.safeParse({
      phones: ['02112345678', { number: '021 12345678' }],
    }).success,
  ).toBe(false);
});
test('location hierarchy and coordinate ranges are validated', () => {
  expect(
    branchPatchSchema.safeParse({ location: { cityId: id } }).success,
  ).toBe(false);
  expect(
    branchPatchSchema.safeParse({
      location: { coordinates: [91, 30] },
    }).success,
  ).toBe(false);
  expect(branchPatchSchema.parse({ location: null }).location).toBeNull();
});
test('supports overnight, 24-hour, gender-specific and closed-day exceptions', () => {
  const hours = openingHoursSchema.parse({
    weekly: [
      { dayOfWeek: 0, audience: 'men', startMinute: 1320, endMinute: 1560 },
      { dayOfWeek: 0, audience: 'women', startMinute: 0, endMinute: 1440 },
    ],
    exceptions: [{ date: '2026-12-01', audience: 'all', isClosed: true }],
  });
  expect(hours.weekly[0].endMinute).toBe(1560);
});
test('detects overlap across adjacent days and the end of the week', () => {
  for (const day of [0, 6])
    expect(
      openingHoursSchema.safeParse({
        weekly: [
          { dayOfWeek: day, startMinute: 1380, endMinute: 1500 },
          { dayOfWeek: (day + 1) % 7, startMinute: 30, endMinute: 90 },
        ],
      }).success,
    ).toBe(false);
  expect(
    openingHoursSchema.safeParse({
      weekly: [
        { dayOfWeek: 1, startMinute: 500, endMinute: 700 },
        { dayOfWeek: 1, audience: 'men', startMinute: 600, endMinute: 800 },
      ],
    }).success,
  ).toBe(false);
});
test('rejects impossible exceptions, reversed age ranges and invalid dates', () => {
  expect(
    openingHoursSchema.safeParse({
      weekly: [],
      exceptions: [{ date: '2026-02-30', isClosed: true }],
    }).success,
  ).toBe(false);
  expect(
    openingHoursSchema.safeParse({
      weekly: [],
      exceptions: [{ date: '2026-12-01', isClosed: false, intervals: [] }],
    }).success,
  ).toBe(false);
  expect(
    openingHoursSchema.safeParse({
      weekly: [],
      exceptions: [
        {
          date: '2026-12-01',
          isClosed: true,
          intervals: [{ startMinute: 1, endMinute: 2 }],
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    branchPatchSchema.safeParse({
      audiencePolicies: { audiences: ['men'], minimumAge: 25, maximumAge: 18 },
    }).success,
  ).toBe(false);
});

test('partial updates do not inject create-time defaults', () => {
  expect(taxonomyPatchSchema.parse({ name: 'نام جدید' })).not.toHaveProperty(
    'isActive',
  );
  expect(spacePatchSchema.parse({ capacity: null })).not.toHaveProperty(
    'operatingStatus',
  );
});
