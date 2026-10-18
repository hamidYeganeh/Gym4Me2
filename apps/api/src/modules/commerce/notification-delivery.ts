import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';

type Notification = {
  userId: string;
  title: string;
  body: string;
  href: string;
  sourceKey: string;
  preference?: 'messages' | 'invitations' | 'reminders';
};

/** Keep eligibility and insertion under the same lock used by account erasure. */
export async function deliverSportsNotification(
  db: Db | Tx,
  input: Notification,
) {
  const preference =
    input.preference === 'messages'
      ? sql`p.messages`
      : input.preference === 'invitations'
        ? sql`p.invitations`
        : sql`p.reminders`;
  const result = await db.execute<{ id: string }>(sql`
    WITH recipient AS MATERIALIZED (
      SELECT id FROM users WHERE id=${input.userId}
        AND status='active' AND deleted_at IS NULL AND NOT deletion_pending
      FOR SHARE
    )
    INSERT INTO sport_notifications(user_id,title,body,href,source_key)
    SELECT recipient.id,${input.title},${input.body},${input.href},${input.sourceKey}
    FROM recipient
    WHERE ${input.preference ? sql`coalesce((SELECT ${preference} FROM sport_notification_preferences p WHERE p.user_id=recipient.id),true)` : sql`true`}
    ON CONFLICT(source_key) DO NOTHING RETURNING id
  `);
  return result.rows[0]?.id ?? null;
}
