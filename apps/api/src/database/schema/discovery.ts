import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
export const discoveryContent = pgTable(
  'discovery_content',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    page: text('page').notNull(),
    position: integer('position').notNull().default(0),
    published: boolean('published').notNull().default(false),
    config: jsonb('config').notNull(),
    revision: integer('revision').notNull().default(1),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'discovery_content_page_check',
      sql`${table.page} IN ('home','clubs','coaches','classes','map')`,
    ),
    check('discovery_content_position_check', sql`${table.position} >= 0`),
    index('discovery_content_page')
      .on(table.page, table.position)
      .where(sql`${table.published} AND ${table.deletedAt} IS NULL`),
  ],
);
