import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { branches, users } from './core';
import { clubs, provinces, cities, districts } from './catalog';
export const tariffGroups = pgTable(
  'club_tariff_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.clubId, t.branchId],
      foreignColumns: [branches.organizationId, branches.id],
      name: 'tariff_branch_tenant_fk',
    }),
  ],
);
export const tariffVersions = pgTable(
  'club_tariff_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => tariffGroups.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    name: text('name').notNull(),
    serviceType: text('service_type', {
      enum: ['visit', 'membership', 'court', 'class', 'coaching'],
    }).notNull(),
    priceToman: integer('price_toman').notNull(),
    currency: text('currency').default('IRT').notNull(),
    unit: text('unit', {
      enum: ['visit', 'hour', 'session', 'month', 'package', 'course'],
    }).notNull(),
    durationDays: integer('duration_days'),
    sessionCount: integer('session_count'),
    includedServices: jsonb('included_services')
      .$type<string[]>()
      .default([])
      .notNull(),
    conditions: text('conditions').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('tariff_group_version_unique').on(t.groupId, t.version),
    check(
      'tariff_amount_valid',
      sql`${t.priceToman} >= 0 and ${t.currency} = 'IRT' and ${t.version} > 0`,
    ),
    check(
      'tariff_allowances_valid',
      sql`(${t.durationDays} is null or ${t.durationDays} > 0) and (${t.sessionCount} is null or ${t.sessionCount} > 0)`,
    ),
  ],
);

export const favoriteClubs = pgTable(
  'favorite_clubs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.clubId] })],
);
export const accountPreferences = pgTable('account_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  acceptedPolicyVersion: text('accepted_policy_version'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  adultConfirmedAt: timestamp('adult_confirmed_at', { withTimezone: true }),
  confirmedMinimumAge: integer('confirmed_minimum_age'),
  marketingConsent: boolean('marketing_consent').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const accountLocations = pgTable(
  'account_locations',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    provinceId: uuid('province_id')
      .notNull()
      .references(() => provinces.id),
    cityId: uuid('city_id'),
    districtId: uuid('district_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.provinceId, t.cityId],
      foreignColumns: [cities.provinceId, cities.id],
      name: 'account_location_city_fk',
    }),
    foreignKey({
      columns: [t.cityId, t.districtId],
      foreignColumns: [districts.cityId, districts.id],
      name: 'account_location_district_fk',
    }),
    check(
      'account_location_chain',
      sql`${t.districtId} IS NULL OR ${t.cityId} IS NOT NULL`,
    ),
  ],
);
export const accountDeletionRequests = pgTable('account_deletion_requests', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'cancelled', 'processed'] })
    .default('pending')
    .notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  eligibleAfter: timestamp('eligible_after', { withTimezone: true }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});
