import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './core';
// Kept out of the public user row to prevent accidental serialization/export.
export const passwordCredentials = pgTable('password_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
