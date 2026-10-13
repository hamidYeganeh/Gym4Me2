import { BadRequestException } from '@nestjs/common';
import { ApiBody, type SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';
import { normalizeDigits } from '../auth/auth.contracts';

export const id = z.uuid();
export const catalogFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    search: z.string().trim().max(100).default(''),
    categoryId: id.optional(),
    sportId: id.optional(),
    cityId: id.optional(),
    districtId: id.optional(),
    serviceType: z
      .enum(['visit', 'membership', 'court', 'class', 'coaching'])
      .optional(),
    unit: z
      .enum(['visit', 'hour', 'session', 'month', 'package', 'course'])
      .optional(),
    minPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    sort: z.enum(['recent', 'priceLow', 'priceHigh']).default('recent'),
  })
  .strict()
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    'Backend.invalidPriceRange',
  );
export const guestSavedSchema = z
  .object({
    ids: z.array(id).max(500),
    filters: catalogFiltersSchema,
  })
  .strict();
export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;

export function normalizeCatalogSearch(value: string) {
  return normalizeDigits(value)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional();
export const name = z.string().trim().min(2).max(120);
const ids = z
  .array(id)
  .max(100)
  .refine(
    (a) => new Set(a).size === a.length,
    'Backend.duplicateIdentifiersAreNotAllowed',
  );
const httpsUrl = z
  .url()
  .refine(
    (v) => new URL(v).protocol === 'https:',
    'Backend.theLinkMustUseHttps',
  );
export const operatingStatus = z.enum([
  'active',
  'temporarily_closed',
  'permanently_closed',
]);
export const audiences = z.enum([
  'all',
  'men',
  'women',
  'mixed',
  'family',
  'private',
]);
const phone = z
  .object({
    number: z
      .string()
      .transform((v) => normalizeDigits(v).replace(/[\s()-]/g, ''))
      .pipe(z.string().regex(/^\+?\d{7,15}$/)),
    label: optionalText(80),
    extension: z
      .string()
      .regex(/^\d{1,10}$/)
      .nullable()
      .optional(),
    isPrimary: z.boolean().default(false),
  })
  .strict();
const phones = z
  .array(
    z.union([
      phone,
      z
        .string()
        .transform((number) => ({ number }))
        .pipe(phone),
    ]),
  )
  .max(10)
  .refine(
    (list) => list.filter((p) => p.isPrimary).length <= 1,
    'Backend.onlyOnePrimaryPhoneNumberIsAllowed',
  )
  .refine(
    (list) =>
      new Set(list.map((p) => `${p.number}:${p.extension ?? ''}`)).size ===
      list.length,
    'Backend.duplicatePhoneNumbersAreNotAllowed',
  );
const gallery = z
  .array(z.object({ mediaId: id, caption: optionalText(300) }).strict())
  .max(50)
  .refine(
    (list) => new Set(list.map((m) => m.mediaId)).size === list.length,
    'Backend.duplicateMediaIsNotAllowed',
  );
export const clubPatchSchema = z
  .object({
    name: name.optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .min(3)
      .max(120)
      .optional(),
    description: optionalText(10000),
    shortDescription: optionalText(280),
    logoId: id.nullable().optional(),
    coverId: id.nullable().optional(),
    categoryIds: ids.optional(),
    sportIds: ids.optional(),
    tagIds: ids.optional(),
    phones: phones.optional(),
    socials: z
      .array(
        z
          .object({
            platform: z.enum([
              'instagram',
              'website',
              'telegram',
              'whatsapp',
              'youtube',
              'aparat',
              'x',
              'linkedin',
              'other',
            ]),
            link: httpsUrl,
            label: optionalText(80),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    gallery: gallery.optional(),
    operatingStatus: operatingStatus.optional(),
  })
  .strict();
export const clubCreateSchema = clubPatchSchema.extend({ name }).strict();
export const locationSchema = z
  .object({
    address: optionalText(1000),
    coordinates: z
      .tuple([
        z.number().finite().min(-90).max(90),
        z.number().finite().min(-180).max(180),
      ])
      .describe('[latitude, longitude]')
      .nullable()
      .optional(),
    countryId: id.nullable().optional(),
    provinceId: id.nullable().optional(),
    cityId: id.nullable().optional(),
    districtId: id.nullable().optional(),
    neighborhood: optionalText(120),
    cityZone: z
      .enum([
        'north',
        'south',
        'east',
        'west',
        'central',
        'northeast',
        'northwest',
        'southeast',
        'southwest',
      ])
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.provinceId && !v.countryId) ||
      (v.cityId && !v.provinceId) ||
      (v.districtId && !v.cityId)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Backend.completeTheCountryProvinceCityAndDistrict',
      });
  });
const interval = z
  .object({
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(2879),
  })
  .strict()
  .refine(
    (v) => v.endMinute > v.startMinute && v.endMinute - v.startMinute <= 1440,
    'Backend.intervalsMustBePositiveAndNoLonger',
  );
const weekly = interval.safeExtend({
  dayOfWeek: z.number().int().min(0).max(6),
  audience: audiences.default('all'),
});
const exception = z
  .object({
    date: z.iso.date(),
    audience: audiences.default('all'),
    isClosed: z.boolean(),
    reason: optionalText(300),
    intervals: z.array(interval).max(10).default([]),
  })
  .strict()
  .refine(
    (v) => (v.isClosed ? v.intervals.length === 0 : v.intervals.length > 0),
    'Backend.closedDatesCannotHaveIntervalsOpenDates',
  );
export const openingHoursSchema = z
  .object({
    weekly: z.array(weekly).max(100),
    exceptions: z.array(exception).max(100).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const overlaps = (
      list: { audience: string; start: number; end: number }[],
    ) =>
      list.some((a, i) =>
        list
          .slice(i + 1)
          .some(
            (b) =>
              (a.audience === b.audience ||
                a.audience === 'all' ||
                b.audience === 'all') &&
              a.start < b.end &&
              b.start < a.end,
          ),
      );
    const ranges = value.weekly.flatMap((w) => {
      const start = w.dayOfWeek * 1440 + w.startMinute;
      const end = w.dayOfWeek * 1440 + w.endMinute;
      return [
        { audience: w.audience, start, end },
        { audience: w.audience, start: start - 10080, end: end - 10080 },
      ];
    });
    if (overlaps(ranges))
      ctx.addIssue({
        code: 'custom',
        message: 'Backend.weeklyOpeningHoursOverlap',
      });
    const keys = value.exceptions.map((e) => `${e.date}:${e.audience}`);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Backend.duplicateExceptionsAreNotAllowed',
      });
    for (const e of value.exceptions) {
      if (
        overlaps(
          e.intervals.map((i) => ({
            audience: e.audience,
            start: i.startMinute,
            end: i.endMinute,
          })),
        )
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Backend.exceptionIntervalsOverlap',
        });
      if (
        e.audience === 'all' &&
        value.exceptions.some((other) => other !== e && other.date === e.date)
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Backend.anAllAudienceExceptionCannotBeCombined',
        });
    }
  });
const equipmentList = z
  .array(
    z
      .object({
        equipmentId: id,
        quantity: z.number().int().positive().max(100000).nullable().optional(),
        description: optionalText(1000),
      })
      .strict(),
  )
  .max(200);
const amenityList = z
  .array(
    z
      .object({
        amenityId: id,
        availability: z
          .enum(['included', 'paid', 'unavailable'])
          .default('included'),
        description: optionalText(1000),
      })
      .strict(),
  )
  .max(200);
export const branchPatchSchema = z
  .object({
    name: name.optional(),
    timezone: z
      .string()
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Backend.invalidTimeZone')
      .optional(),
    location: locationSchema.nullable().optional(),
    sportIds: ids.optional(),
    equipments: equipmentList.optional(),
    amenities: amenityList.optional(),
    accessibilityFeatures: z
      .array(
        z.object({ featureId: id, description: optionalText(1000) }).strict(),
      )
      .max(100)
      .optional(),
    phones: phones.optional(),
    gallery: gallery.optional(),
    operatingStatus: operatingStatus.optional(),
    visitInstructions: optionalText(3000),
    rules: optionalText(5000),
    audiencePolicies: z
      .object({
        audiences: z.array(audiences).min(1).max(6),
        minimumAge: z.number().int().min(0).max(120).nullable().default(null),
        maximumAge: z.number().int().min(0).max(120).nullable().default(null),
        notes: z.string().trim().max(2000).nullable().default(null),
      })
      .strict()
      .refine(
        (v) =>
          v.minimumAge === null ||
          v.maximumAge === null ||
          v.minimumAge <= v.maximumAge,
        'Backend.invalidAgeRange',
      )
      .nullable()
      .optional(),
    openingHours: openingHoursSchema.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const values of [
      v.equipments?.map((e) => e.equipmentId),
      v.amenities?.map((e) => e.amenityId),
      v.accessibilityFeatures?.map((e) => e.featureId),
    ])
      if (values && new Set(values).size !== values.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Backend.duplicateIdentifiersAreNotAllowed',
        });
  });
export const branchCreateSchema = branchPatchSchema.safeExtend({ name });
export const mediaSchema = z
  .object({
    type: z.enum(['image', 'video']),
    url: httpsUrl,
    thumbnailUrl: httpsUrl.nullable().optional(),
    alt: optionalText(300),
    width: z.number().int().positive().max(50000).nullable().optional(),
    height: z.number().int().positive().max(50000).nullable().optional(),
    durationSeconds: z
      .number()
      .int()
      .positive()
      .max(86400)
      .nullable()
      .optional(),
  })
  .strict();
export const taxonomyKindSchema = z.enum([
  'club-categories',
  'sports',
  'equipments',
  'amenities',
  'tags',
  'accessibility-features',
]);
export const taxonomyCreateSchema = z
  .object({
    name,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    description: optionalText(2000),
    isActive: z.boolean().default(true),
  })
  .strict();
export const taxonomyPatchSchema = taxonomyCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export const spaceSchema = z
  .object({
    name,
    description: optionalText(3000),
    capacity: z.number().int().positive().max(100000).nullable().optional(),
    operatingStatus: operatingStatus.default('active'),
  })
  .strict();
export const spacePatchSchema = spaceSchema.partial().extend({
  operatingStatus: operatingStatus.optional(),
});
export const reviewSchema = z
  .object({ rating: z.number().int().min(1).max(5), body: optionalText(3000) })
  .strict();
export const decisionSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'suspended']),
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();
export const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);
export type ClubPatch = z.infer<typeof clubPatchSchema>;
export type BranchPatch = z.infer<typeof branchPatchSchema>;
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      message: 'Backend.invalidClubInformation',
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  return result.data;
}
// The same schemas drive runtime validation and OpenAPI required/nullable metadata.
export const SchemaBody = (schema: z.ZodType) =>
  ApiBody({
    schema: z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      io: 'input',
      unrepresentable: 'any',
    }) as SchemaObject,
  });
export const geographyKindSchema = z.enum([
  'countries',
  'provinces',
  'cities',
  'districts',
]);
export const geographySchema = z
  .object({
    kind: geographyKindSchema,
    name,
    parentId: id.optional(),
    code: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .strict();
export const geographyPatchSchema = z.object({ name }).strict();
export const affiliationSchema = z
  .object({
    coachId: id,
    sportId: id.nullable().optional(),
    startsOn: z.iso.date().nullable().optional(),
    endsOn: z.iso.date().nullable().optional(),
  })
  .strict()
  .refine(
    (v) => !v.startsOn || !v.endsOn || v.startsOn <= v.endsOn,
    'Backend.invalidAffiliationDateRange',
  );
