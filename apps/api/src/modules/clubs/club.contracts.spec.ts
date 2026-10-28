import { randomUUID } from 'node:crypto';
import {
  branchPatchSchema,
  clubCreateSchema,
  clubPatchSchema,
  openingHoursSchema,
  taxonomyPatchSchema,
  spacePatchSchema,
  optionSearchSchema,
  optionLimitSchema,
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

test('picker search and pagination reject unbounded or invalid input', () => {
  expect(optionLimitSchema(100).parse(undefined)).toBe(100);
  expect(optionLimitSchema().parse(undefined)).toBeUndefined();
  expect(optionLimitSchema().parse('25')).toBe(25);
  for (const limit of ['0', '-1', '1001', '2.5', 'abc'])
    expect(optionLimitSchema().safeParse(limit).success).toBe(false);
  expect(optionSearchSchema.parse('  Tehran  ')).toBe('Tehran');
  expect(optionSearchSchema.safeParse('a'.repeat(101)).success).toBe(false);
});

test('club FAQs preserve order, trim content and allow clearing the list', () => {
  expect(
    clubPatchSchema.parse({
      faq: [
        { question: ' Hours? ', answer: ' Until 10. ' },
        { question: 'Parking?', answer: 'Yes.' },
      ],
    }).faq,
  ).toEqual([
    { question: 'Hours?', answer: 'Until 10.' },
    { question: 'Parking?', answer: 'Yes.' },
  ]);
  expect(clubPatchSchema.parse({ faq: [] }).faq).toEqual([]);
  expect(clubPatchSchema.parse({}).faq).toBeUndefined();
});
test('club FAQs reject empty, oversized and unexpected content', () => {
  for (const faq of [
    [{ question: ' ', answer: 'Answer' }],
    [{ question: 'Question', answer: '' }],
    [{ question: 'x'.repeat(301), answer: 'Answer' }],
    [{ question: 'Question', answer: 'x'.repeat(3001) }],
    [{ question: 'Question', answer: 'Answer', html: true }],
    Array.from({ length: 21 }, () => ({
      question: 'Question',
      answer: 'Answer',
    })),
    null,
  ])
    expect(clubPatchSchema.safeParse({ faq }).success).toBe(false);
});

test('catalog icons accept stable font names and nullable resets', () => {
  expect(
    taxonomyPatchSchema.parse({ iconName: 'BarbellHorizontalIcon' }).iconName,
  ).toBe('BarbellHorizontalIcon');
  expect(taxonomyPatchSchema.parse({ iconName: null }).iconName).toBeNull();
  expect(taxonomyPatchSchema.parse({ name: 'بدنسازی' })).not.toHaveProperty(
    'iconName',
  );
  for (const iconName of ['<svg/>', '../../file', 'x'.repeat(101)]) {
    expect(taxonomyPatchSchema.safeParse({ iconName }).success).toBe(false);
  }
});

test('club contacts retain multiple department labels, extensions and the single primary choice', () => {
  const phones = [
    {
      number: '۰۲۱ ۵۶۷۸۱۲۳۴',
      label: 'دفتر مدیریت',
      extension: '101',
      isPrimary: true,
    },
    {
      number: '02156781235',
      label: 'پذیرش',
      extension: null,
      isPrimary: false,
    },
  ];
  const parsed = clubPatchSchema.parse({ phones }).phones!;
  expect(parsed.map((phone) => phone.label)).toEqual(['دفتر مدیریت', 'پذیرش']);
  expect(parsed[0].number).toBe('02156781234');
  expect(branchPatchSchema.parse({ phones }).phones).toEqual(parsed);
  expect(
    clubPatchSchema.safeParse({
      phones: phones.map((phone) => ({ ...phone, isPrimary: true })),
    }).success,
  ).toBe(false);
});
