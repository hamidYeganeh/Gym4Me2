import { sql } from 'drizzle-orm';

/** Only outstanding purchased work extends plan delivery after a relationship ends.
 * This predicate never grants access to messages, measurements or workout history.
 * Queries bind the relationship as r.
 */
export const openProgramContract = sql`EXISTS(SELECT 1 FROM sport_program_requests contract JOIN sport_orders contract_order ON contract_order.id=contract.order_id WHERE contract.relationship_id=r.id AND contract_order.status IN ('paid','partially_refunded') AND (contract.status IN ('intake','queued','preparing','revision_requested') OR contract.status='delivered' AND contract.support_ends_at>now()))`;
