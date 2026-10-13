import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { branches, organizations, organizationMembers, users } from './core';

const created = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updated = () =>
  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();
export const publicationState = pgEnum('club_publication_state', [
  'draft',
  'pending_review',
  'published',
  'hidden',
]);
export const operatingState = pgEnum('club_operating_state', [
  'active',
  'temporarily_closed',
  'permanently_closed',
]);
export const mediaType = pgEnum('club_media_type', ['image', 'video']);
export const audienceType = pgEnum('club_audience', [
  'all',
  'men',
  'women',
  'mixed',
  'family',
  'private',
]);
export const availabilityType = pgEnum('amenity_availability', [
  'included',
  'paid',
  'unavailable',
]);
export const zoneType = pgEnum('city_zone', [
  'north',
  'south',
  'east',
  'west',
  'central',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
]);

function taxonomy<T extends string>(name: T) {
  return pgTable(
    name,
    {
      id: uuid('id').defaultRandom().primaryKey(),
      name: varchar('name', { length: 120 }).notNull(),
      slug: varchar('slug', { length: 120 }).notNull().unique(),
      description: text('description'),
      isActive: boolean('is_active').default(true).notNull(),
      createdAt: created(),
      updatedAt: updated(),
    },
    (t) => [check(`${name}_name_nonempty`, sql`length(trim(${t.name})) >= 2`)],
  );
}
export const clubCategories = taxonomy('club_categories');
export const sports = taxonomy('sports');
export const equipments = taxonomy('equipments');
export const amenities = taxonomy('amenities');
export const tags = taxonomy('club_tags');
export const accessibilityFeatures = taxonomy('accessibility_features');

export const countries = pgTable('countries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: varchar('code', { length: 2 }).notNull().unique(),
});
export const provinces = pgTable(
  'provinces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    countryId: uuid('country_id')
      .notNull()
      .references(() => countries.id),
    name: text('name').notNull(),
  },
  (t) => [
    unique('province_country_id').on(t.countryId, t.id),
    unique('province_country_name').on(t.countryId, t.name),
  ],
);
export const cities = pgTable(
  'cities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provinceId: uuid('province_id')
      .notNull()
      .references(() => provinces.id),
    name: text('name').notNull(),
  },
  (t) => [
    unique('city_province_id').on(t.provinceId, t.id),
    unique('city_province_name').on(t.provinceId, t.name),
  ],
);
export const districts = pgTable(
  'districts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id),
    name: text('name').notNull(),
  },
  (t) => [
    unique('district_city_id').on(t.cityId, t.id),
    unique('district_city_name').on(t.cityId, t.name),
  ],
);

// Media records are tenant-owned metadata. Binary upload/storage is a separate adapter.
export const clubMedia = pgTable(
  'club_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    type: mediaType('type').notNull(),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    alt: text('alt'),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    objectKey: text('object_key').unique(),
    contentType: text('content_type'),
    sizeBytes: integer('size_bytes'),
    createdAt: created(),
  },
  (t) => [
    unique('media_org_id').on(t.organizationId, t.id),
    check(
      'media_dimensions_positive',
      sql`(${t.width} is null or ${t.width} > 0) and (${t.height} is null or ${t.height} > 0) and (${t.durationSeconds} is null or ${t.durationSeconds} > 0)`,
    ),
  ],
);

// A club's public identity extends the existing workforce tenant; name/slug live in organizations.
export const clubs = pgTable(
  'clubs',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    ownerRole: text('owner_role').default('owner').notNull(),
    logoId: uuid('logo_id'),
    coverId: uuid('cover_id'),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 280 }),
    publicationStatus: publicationState('publication_status')
      .default('draft')
      .notNull(),
    operatingStatus: operatingState('operating_status')
      .default('active')
      .notNull(),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    check('club_owner_role_fixed', sql`${t.ownerRole} = 'owner'`),
    foreignKey({
      columns: [t.id, t.ownerId, t.ownerRole],
      foreignColumns: [
        organizationMembers.organizationId,
        organizationMembers.userId,
        organizationMembers.role,
      ],
      name: 'club_owner_membership_fk',
    }),
    foreignKey({
      columns: [t.id, t.logoId],
      foreignColumns: [clubMedia.organizationId, clubMedia.id],
      name: 'club_logo_tenant_fk',
    }),
    foreignKey({
      columns: [t.id, t.coverId],
      foreignColumns: [clubMedia.organizationId, clubMedia.id],
      name: 'club_cover_tenant_fk',
    }),
    index('clubs_publication_idx').on(t.publicationStatus),
  ],
);

export const clubCategoryLinks = pgTable(
  'club_category_links',
  {
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => clubCategories.id),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.categoryId] })],
);
export const clubSportLinks = pgTable(
  'club_sport_links',
  {
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    sportId: uuid('sport_id')
      .notNull()
      .references(() => sports.id),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.sportId] })],
);
export const clubTagLinks = pgTable(
  'club_tag_links',
  {
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.tagId] })],
);

export const branchProfiles = pgTable(
  'branch_profiles',
  {
    branchId: uuid('branch_id')
      .primaryKey()
      .references(() => branches.id, { onDelete: 'cascade' }),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    isMain: boolean('is_main').default(false).notNull(),
    operatingStatus: operatingState('operating_status')
      .default('active')
      .notNull(),
    address: text('address'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    countryId: uuid('country_id').references(() => countries.id),
    provinceId: uuid('province_id'),
    cityId: uuid('city_id'),
    districtId: uuid('district_id'),
    neighborhood: varchar('neighborhood', { length: 120 }),
    cityZone: zoneType('city_zone'),
    visitInstructions: text('visit_instructions'),
    rules: text('rules'),
    // A bounded value object; no global identities or independently queried entities inside.
    audiencePolicies: jsonb('audience_policies').$type<{
      audiences: string[];
      minimumAge: number | null;
      maximumAge: number | null;
      notes: string | null;
    }>(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    unique('branch_profile_club_id').on(t.clubId, t.branchId),
    uniqueIndex('branch_main_per_club')
      .on(t.clubId)
      .where(sql`${t.isMain} = true`),
    foreignKey({
      columns: [t.clubId, t.branchId],
      foreignColumns: [branches.organizationId, branches.id],
      name: 'branch_profile_tenant_fk',
    }),
    foreignKey({
      columns: [t.countryId, t.provinceId],
      foreignColumns: [provinces.countryId, provinces.id],
      name: 'branch_province_country_fk',
    }),
    foreignKey({
      columns: [t.provinceId, t.cityId],
      foreignColumns: [cities.provinceId, cities.id],
      name: 'branch_city_province_fk',
    }),
    foreignKey({
      columns: [t.cityId, t.districtId],
      foreignColumns: [districts.cityId, districts.id],
      name: 'branch_district_city_fk',
    }),
    check(
      'branch_coordinate_pair',
      sql`(${t.latitude} is null and ${t.longitude} is null) or (${t.latitude} is not null and ${t.longitude} is not null and ${t.latitude} between -90 and 90 and ${t.longitude} between -180 and 180)`,
    ),
    check(
      'branch_geography_chain',
      sql`(${t.provinceId} is null or ${t.countryId} is not null) and (${t.cityId} is null or ${t.provinceId} is not null) and (${t.districtId} is null or ${t.cityId} is not null)`,
    ),
    index('branch_location_city_idx').on(t.cityId),
  ],
);
export const clubPhones = pgTable(
  'club_phones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id'),
    number: varchar('number', { length: 20 }).notNull(),
    label: varchar('label', { length: 80 }),
    extension: varchar('extension', { length: 10 }),
    isPrimary: boolean('is_primary').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.clubId, t.branchId],
      foreignColumns: [branchProfiles.clubId, branchProfiles.branchId],
      name: 'phone_branch_tenant_fk',
    }).onDelete('cascade'),
  ],
);
export const clubSocials = pgTable('club_socials', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 30 }).notNull(),
  link: text('link').notNull(),
  label: varchar('label', { length: 80 }),
  sortOrder: integer('sort_order').default(0).notNull(),
});
export const clubGallery = pgTable(
  'club_gallery',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id'),
    mediaId: uuid('media_id').notNull(),
    caption: varchar('caption', { length: 300 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.clubId, t.mediaId],
      foreignColumns: [clubMedia.organizationId, clubMedia.id],
      name: 'gallery_media_tenant_fk',
    }),
    foreignKey({
      columns: [t.clubId, t.branchId],
      foreignColumns: [branchProfiles.clubId, branchProfiles.branchId],
      name: 'gallery_branch_tenant_fk',
    }).onDelete('cascade'),
    uniqueIndex('gallery_club_media_unique')
      .on(t.clubId, t.mediaId)
      .where(sql`${t.branchId} is null`),
    uniqueIndex('gallery_branch_media_unique')
      .on(t.branchId, t.mediaId)
      .where(sql`${t.branchId} is not null`),
  ],
);
export const branchSports = pgTable(
  'branch_sports',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    sportId: uuid('sport_id')
      .notNull()
      .references(() => sports.id),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.sportId] })],
);
export const branchEquipments = pgTable(
  'branch_equipments',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    equipmentId: uuid('equipment_id')
      .notNull()
      .references(() => equipments.id),
    quantity: integer('quantity'),
    description: text('description'),
  },
  (t) => [
    primaryKey({ columns: [t.branchId, t.equipmentId] }),
    check(
      'equipment_quantity_positive',
      sql`${t.quantity} is null or ${t.quantity} > 0`,
    ),
  ],
);
export const branchAmenities = pgTable(
  'branch_amenities',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id),
    availability: availabilityType('availability')
      .default('included')
      .notNull(),
    description: text('description'),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.amenityId] })],
);
export const branchAccessibility = pgTable(
  'branch_accessibility',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    featureId: uuid('feature_id')
      .notNull()
      .references(() => accessibilityFeatures.id),
    description: text('description'),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.featureId] })],
);
export const spaces = pgTable(
  'club_spaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    capacity: integer('capacity'),
    operatingStatus: operatingState('operating_status')
      .default('active')
      .notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    check(
      'space_capacity_positive',
      sql`${t.capacity} is null or ${t.capacity} > 0`,
    ),
  ],
);

// Minutes after midnight; endMinute may exceed 1440 to represent overnight opening.
export const weeklyHours = pgTable(
  'branch_weekly_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    audience: audienceType('audience').default('all').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    check(
      'weekly_hour_bounds',
      sql`${t.dayOfWeek} between 0 and 6 and ${t.startMinute} between 0 and 1439 and ${t.endMinute} > ${t.startMinute} and ${t.endMinute} <= ${t.startMinute} + 1440`,
    ),
    index('weekly_branch_idx').on(t.branchId),
  ],
);
export const openingExceptions = pgTable(
  'branch_opening_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    audience: audienceType('audience').default('all').notNull(),
    isClosed: boolean('is_closed').notNull(),
    reason: varchar('reason', { length: 300 }),
  },
  (t) => [
    unique('exception_branch_date_audience').on(t.branchId, t.date, t.audience),
  ],
);
export const exceptionIntervals = pgTable(
  'branch_exception_intervals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exceptionId: uuid('exception_id')
      .notNull()
      .references(() => openingExceptions.id, { onDelete: 'cascade' }),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
  },
  (t) => [
    check(
      'exception_hour_bounds',
      sql`${t.startMinute} between 0 and 1439 and ${t.endMinute} > ${t.startMinute} and ${t.endMinute} <= ${t.startMinute} + 1440`,
    ),
  ],
);

export const coachProfiles = pgTable('coach_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  biography: text('biography'),
  createdAt: created(),
  updatedAt: updated(),
});
export const branchCoaches = pgTable(
  'branch_coaches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coachProfiles.userId),
    sportId: uuid('sport_id').references(() => sports.id),
    status: text('status', { enum: ['pending', 'active', 'ended'] })
      .default('pending')
      .notNull(),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    createdAt: created(),
  },
  (t) => [
    unique('branch_coach_unique').on(t.branchId, t.coachId),
    check(
      'coach_affiliation_status',
      sql`${t.status} in ('pending', 'active', 'ended')`,
    ),
    check(
      'coach_affiliation_dates',
      sql`${t.endsOn} is null or ${t.startsOn} is null or ${t.endsOn} >= ${t.startsOn}`,
    ),
  ],
);
export const clubReviews = pgTable(
  'club_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branchProfiles.branchId, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    rating: integer('rating').notNull(),
    body: text('body'),
    status: text('status', { enum: ['pending', 'published', 'rejected'] })
      .default('pending')
      .notNull(),
    moderationReason: text('moderation_reason'),
    reply: text('reply'),
    repliedBy: uuid('replied_by').references(() => users.id),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    unique('review_branch_author').on(t.branchId, t.authorId),
    check('review_rating_bounds', sql`${t.rating} between 1 and 5`),
    check(
      'review_status_allowed',
      sql`${t.status} in ('pending', 'published', 'rejected')`,
    ),
    index('review_branch_status_idx').on(t.branchId, t.status),
  ],
);
