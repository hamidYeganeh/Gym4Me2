import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Db, Tx } from '../clubs/club.repository';
import { rows } from '../commerce/commerce.service';
import { coachingWrite, approvedCoach } from '../coaching/practice.service';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import * as c from './training.contracts';
import { openProgramContract } from '../commerce/program-contract';

type PlanRow = {
  id: string;
  owner_id: string | null;
  athlete_id: string | null;
  relationship_id: string | null;
  title: string;
  draft: c.PlanContent;
  revision: number;
  is_template: boolean;
  archived: boolean;
};
export type Relationship = {
  id: string;
  coach_id: string;
  student_id: string;
  status: string;
};
export async function trainingRelationship(
  db: Db | Tx,
  actor: string,
  id: string,
  write = false,
  purchasedPlan = false,
) {
  const [r] = await rows<Relationship>(
    db,
    sql`SELECT r.* FROM coaching_relationships r JOIN users c ON c.id=r.coach_id JOIN users u ON u.id=r.student_id WHERE r.id=${id} AND (r.coach_id=${actor} OR r.student_id=${actor}) AND c.status='active' AND u.status='active' AND NOT c.deletion_pending AND NOT u.deletion_pending AND c.deleted_at IS NULL AND u.deleted_at IS NULL FOR SHARE OF r`,
  );
  const contract =
    r && purchasedPlan && r.coach_id === actor
      ? await rows(
          db,
          sql`SELECT r.id FROM coaching_relationships r WHERE r.id=${id} AND ${openProgramContract}`,
        )
      : [];
  if (
    !r ||
    (r.status !== 'active' &&
      (write || r.coach_id === actor) &&
      !contract.length)
  )
    throw new NotFoundException('Coaching.notFound');
  return r;
}
export async function trainingCommand<T>(
  db: Db,
  actor: string,
  operationId: string,
  payload: unknown,
  work: (tx: Tx) => Promise<T>,
  authorize?: (tx: Tx) => Promise<unknown>,
): Promise<T> {
  return coachingWrite(db, actor, async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${actor}),4304)`,
    );
    if (authorize) await authorize(tx);
    const hash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const [prior] = await rows<{ request_hash: string; result: T }>(
      tx,
      sql`SELECT request_hash,result FROM training_receipts WHERE actor_id=${actor} AND operation_id=${operationId}`,
    );
    if (prior) {
      if (prior.request_hash !== hash)
        throw new ConflictException('Training.operationConflict');
      return prior.result;
    }
    const result = await work(tx);
    await tx.execute(
      sql`INSERT INTO training_receipts(actor_id,operation_id,request_hash,result) VALUES(${actor},${operationId},${hash},${JSON.stringify(result)}::jsonb)`,
    );
    return result;
  });
}
@Injectable()
export class TrainingService {
  constructor(private readonly database: DatabaseService) {}
  private get db() {
    return this.database.db;
  }
  async library(search = '') {
    const term = `%${search}%`;
    return rows(
      this.db,
      sql`SELECT * FROM training_exercises WHERE NOT archived AND (name_fa ILIKE ${term} OR name_en ILIKE ${term} OR equipment ILIKE ${term} OR array_to_string(tags,' ') ILIKE ${term}) ORDER BY id LIMIT 100`,
    );
  }
  async homeSummary(actor: string) {
    const [active] = await rows<{ id: string; title: string }>(
      this.db,
      sql`SELECT id,snapshot->>'title' title FROM training_sessions WHERE athlete_id=${actor} AND state='in_progress' ORDER BY started_at DESC LIMIT 1`,
    );
    const [plan] = await rows<{ id: string; title: string }>(
      this.db,
      sql`SELECT a.id,v.content->>'title' title FROM training_assignments a JOIN training_versions v ON v.id=a.version_id WHERE a.athlete_id=${actor} AND v.effective_from<=(now() AT TIME ZONE 'Asia/Tehran')::date ORDER BY v.effective_from DESC,v.version DESC,a.id LIMIT 1`,
    );
    return { active: active ?? null, plan: plan ?? null };
  }
  async workspace(actor: string) {
    const plans = await rows(
      this.db,
      sql`SELECT p.id,p.title,p.revision,p.is_template,p.archived,p.owner_id,p.relationship_id,p.updated_at FROM training_plans p WHERE p.owner_id=${actor} AND NOT p.archived AND (p.relationship_id IS NULL OR EXISTS(SELECT 1 FROM coaching_relationships r WHERE r.id=p.relationship_id AND (r.status='active' OR ${openProgramContract}))) ORDER BY updated_at DESC LIMIT 100`,
    );
    const assignments = await rows(
      this.db,
      sql`SELECT DISTINCT ON(v.plan_id) a.id,a.relationship_id,v.id AS version_id,v.plan_id,v.version,v.content,v.effective_from FROM training_assignments a JOIN training_versions v ON v.id=a.version_id WHERE a.athlete_id=${actor} AND v.effective_from<=(now() AT TIME ZONE 'Asia/Tehran')::date ORDER BY v.plan_id,v.effective_from DESC,v.version DESC LIMIT 100`,
    );
    const sessions = await rows(
      this.db,
      sql`SELECT * FROM training_sessions WHERE athlete_id=${actor} ORDER BY started_at DESC LIMIT 100`,
    );
    const relationships = await rows(
      this.db,
      sql`SELECT r.id,r.coach_id,r.student_id,r.status,CASE WHEN r.coach_id=${actor} THEN u.display_name ELSE c.display_name END AS display_name,coalesce(s.personal_plans,false) AS personal_plans,coalesce(s.measurements,false) AS measurements FROM coaching_relationships r JOIN users u ON u.id=r.student_id JOIN users c ON c.id=r.coach_id LEFT JOIN training_sharing s ON s.relationship_id=r.id WHERE (r.student_id=${actor} OR r.coach_id=${actor}) AND (r.status='active' OR ${openProgramContract}) AND u.status='active' AND c.status='active' AND NOT u.deletion_pending AND NOT c.deletion_pending ORDER BY r.created_at DESC LIMIT 100`,
    );
    const tasks = await rows(
      this.db,
      sql`SELECT r.id AS relationship_id,
      (SELECT count(*)::int FROM training_sessions s WHERE s.athlete_id=r.student_id AND s.state='completed' AND s.reviewed_at IS NULL AND ((s.shared AND s.relationship_id=r.id) OR (s.relationship_id IS NULL AND coalesce(sh.personal_plans,false)))) AS workouts,
      (SELECT count(*)::int FROM training_checkins c WHERE c.relationship_id=r.id AND c.feedback='') AS checkins,
      (SELECT count(*)::int FROM training_plans p WHERE p.relationship_id=r.id AND p.owner_id=${actor} AND NOT p.archived AND p.review_due_at<=now()) AS plans,
      (SELECT count(*)::int FROM training_messages m WHERE m.relationship_id=r.id AND m.sender_id<>${actor} AND m.created_at>coalesce((SELECT read_at FROM training_reads WHERE relationship_id=r.id AND user_id=${actor}),'1970-01-01')) AS messages
      FROM coaching_relationships r LEFT JOIN training_sharing sh ON sh.relationship_id=r.id WHERE r.coach_id=${actor} AND r.status='active'`,
    );
    const pending = await rows<{ id: string }>(
      this.db,
      sql`SELECT r.id FROM coaching_relationships r WHERE r.student_id=${actor} AND r.status='active' AND NOT EXISTS(SELECT 1 FROM training_checkins c WHERE c.relationship_id=r.id AND c.week_start=(now() AT TIME ZONE 'Asia/Tehran')::date-((extract(dow FROM now() AT TIME ZONE 'Asia/Tehran')::int+1)%7)) LIMIT 20`,
    );
    const week = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const date = new Date(week + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
    for (const r of pending)
      await deliverSportsNotification(this.db, {
        userId: actor,
        title: 'Training.weeklyCheckin',
        body: 'Training.weeklyHint',
        href: `/training/conversation?id=${r.id}`,
        sourceKey: `training-weekly:${r.id}:${date.toISOString().slice(0, 10)}`,
        preference: 'reminders',
      });
    return {
      actorId: actor,
      plans,
      assignments,
      sessions,
      relationships,
      tasks,
      capabilities: { privateVideo: false },
    };
  }
  async plan(actor: string, id: string) {
    const [p] = await rows<PlanRow>(
      this.db,
      sql`SELECT * FROM training_plans WHERE id=${id} AND (owner_id=${actor} OR athlete_id=${actor})`,
    );
    if (!p) throw new NotFoundException('Training.notFound');
    if (p.owner_id === actor && p.relationship_id)
      await trainingRelationship(
        this.db,
        actor,
        p.relationship_id,
        false,
        true,
      );
    const versions = await rows(
      this.db,
      sql`SELECT * FROM training_versions WHERE plan_id=${id} ORDER BY version DESC LIMIT 50`,
    );
    if (p.owner_id !== actor && !versions.length)
      throw new NotFoundException('Training.notFound');
    return {
      ...p,
      title:
        p.owner_id === actor
          ? p.title
          : ((versions[0]?.content as c.PlanContent | undefined)?.title ??
            p.title),
      draft: p.owner_id === actor ? p.draft : null,
      canEdit: p.owner_id === actor,
      versions,
    };
  }
  private async legacyContract(
    tx: Tx,
    actor: string,
    requestId: string,
    relationshipId: string | null,
  ) {
    const [contract] = await rows(
      tx,
      sql`SELECT p.id FROM sport_program_requests p JOIN sport_orders o ON o.id=p.order_id WHERE p.id=${requestId} AND p.coach_id=${actor} AND p.relationship_id=${relationshipId} AND o.status IN ('paid','partially_refunded') AND p.status IN ('queued','preparing','revision_requested') FOR SHARE OF o,p`,
    );
    if (!contract) throw new NotFoundException('Training.notFound');
  }
  async save(
    actor: string,
    input: z.infer<typeof c.savePlan>,
    legacyRequestId?: string,
  ) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      legacyRequestId
        ? ['savePlan', input, legacyRequestId]
        : ['savePlan', input],
      async (tx) => {
        let athlete = actor;
        if (input.relationshipId) {
          const r = await trainingRelationship(
            tx,
            actor,
            input.relationshipId,
            true,
            true,
          );
          if (r.coach_id !== actor)
            throw new NotFoundException('Coaching.notFound');
          await approvedCoach(tx, actor);
          athlete = r.student_id;
        }
        const ids = [
          ...new Set(
            input.content.days.flatMap((d) =>
              d.exercises.map((e) => e.exerciseId),
            ),
          ),
        ];
        const valid = await rows(
          tx,
          sql`SELECT id FROM training_exercises WHERE id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`,`,
          )}) AND NOT archived`,
        );
        if (valid.length !== ids.length)
          throw new BadRequestException('Training.invalidExercise');
        const [old] = await rows<PlanRow>(
          tx,
          sql`SELECT * FROM training_plans WHERE id=${input.id} FOR UPDATE`,
        );
        if (
          old &&
          (old.owner_id !== actor ||
            old.relationship_id !== input.relationshipId)
        )
          throw new NotFoundException('Training.notFound');
        if ((old?.revision ?? 0) !== input.revision)
          throw new ConflictException('Training.conflict');
        const [p] = await rows(
          tx,
          sql`INSERT INTO training_plans(id,owner_id,athlete_id,relationship_id,title,draft,is_template) VALUES(${input.id},${actor},${athlete},${input.relationshipId},${input.content.title},${JSON.stringify(input.content)}::jsonb,${input.isTemplate}) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,draft=EXCLUDED.draft,is_template=EXCLUDED.is_template,revision=training_plans.revision+1,updated_at=now() RETURNING *`,
        );
        return p;
      },
      async (tx) => {
        if (input.relationshipId)
          await trainingRelationship(
            tx,
            actor,
            input.relationshipId,
            true,
            true,
          );
        if (legacyRequestId)
          await this.legacyContract(
            tx,
            actor,
            legacyRequestId,
            input.relationshipId,
          );
      },
    );
  }
  async publish(
    actor: string,
    id: string,
    input: z.infer<typeof c.publishPlan>,
    legacyRequestId?: string,
  ) {
    const authorize = async (tx: Tx) => {
      const [p] = await rows<PlanRow>(
        tx,
        sql`SELECT * FROM training_plans WHERE id=${id} AND owner_id=${actor}`,
      );
      if (!p) throw new NotFoundException('Training.notFound');
      if (legacyRequestId)
        await this.legacyContract(
          tx,
          actor,
          legacyRequestId,
          p.relationship_id,
        );
      if (p.relationship_id)
        await trainingRelationship(tx, actor, p.relationship_id, true, true);
    };
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      legacyRequestId
        ? ['publish', id, input, legacyRequestId]
        : ['publish', id, input],
      async (tx) => {
        const [p] = await rows<PlanRow>(
          tx,
          sql`SELECT * FROM training_plans WHERE id=${id} AND owner_id=${actor} AND NOT archived FOR UPDATE`,
        );
        if (!p) throw new NotFoundException('Training.notFound');
        if (p.revision !== input.revision)
          throw new ConflictException('Training.conflict');
        if (p.is_template)
          throw new BadRequestException('Training.copyTemplateFirst');
        if (p.relationship_id) {
          await trainingRelationship(tx, actor, p.relationship_id, true, true);
          await approvedCoach(tx, actor);
        }
        if (!p.athlete_id) throw new NotFoundException('Training.notFound');
        const [v] = await rows<{ id: string; version: number }>(
          tx,
          sql`INSERT INTO training_versions(plan_id,version,content,effective_from) SELECT ${id},coalesce(max(version),0)+1,${JSON.stringify(p.draft)}::jsonb,${input.effectiveFrom} FROM training_versions WHERE plan_id=${id} RETURNING id,version`,
        );
        const [a] = await rows(
          tx,
          sql`INSERT INTO training_assignments(version_id,athlete_id,relationship_id) VALUES(${v.id},${p.athlete_id},${p.relationship_id}) RETURNING *`,
        );
        await tx.execute(
          sql`UPDATE training_plans SET revision=revision+1,updated_at=now(),review_due_at=CASE WHEN relationship_id IS NOT NULL THEN ${input.effectiveFrom}::date+interval '7 days' ELSE NULL END WHERE id=${id}`,
        );
        if (p.athlete_id !== actor)
          await deliverSportsNotification(tx, {
            userId: p.athlete_id,
            title: 'Training.planPublished',
            body: 'Training.openPlan',
            href: '/training',
            sourceKey: `training-plan:${v.id}`,
            preference: 'messages',
          });
        return { assignment: a, version: v.version };
      },
      authorize,
    );
  }
  async sync(actor: string, input: z.infer<typeof c.syncSession>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['sync', input],
      async (tx) => {
        const [old] = await rows<{
          athlete_id: string;
          revision: number;
          state: string;
          snapshot: c.PlanContent;
          assignment_id: string | null;
          day_index: number;
          relationship_id: string | null;
          started_at: Date;
        }>(
          tx,
          sql`SELECT * FROM training_sessions WHERE id=${input.id} FOR UPDATE`,
        );
        if (old?.athlete_id && old.athlete_id !== actor)
          throw new NotFoundException('Training.notFound');
        if ((old?.revision ?? 0) !== input.revision)
          throw new ConflictException('Training.conflict');
        let snapshot = old?.snapshot,
          relation = old?.relationship_id ?? null;
        if (
          old &&
          (old.assignment_id !== input.assignmentId ||
            old.day_index !== input.dayIndex ||
            new Date(old.started_at).toISOString() !== input.startedAt)
        )
          throw new ConflictException('Training.conflict');
        if (!old) {
          if (!input.assignmentId)
            throw new BadRequestException('Training.publishFirst');
          const [a] = await rows<{
            content: c.PlanContent;
            relationship_id: string | null;
          }>(
            tx,
            sql`SELECT v.content,a.relationship_id FROM training_assignments a JOIN training_versions v ON v.id=a.version_id WHERE a.id=${input.assignmentId} AND a.athlete_id=${actor} AND v.effective_from<=(now() AT TIME ZONE 'Asia/Tehran')::date FOR SHARE OF a`,
          );
          if (!a) throw new NotFoundException('Training.notFound');
          snapshot = a.content;
          relation = a.relationship_id;
          if (Date.parse(input.startedAt) > Date.now() + 60000)
            throw new BadRequestException('Backend.invalidInput');
        }
        if (!snapshot?.days[input.dayIndex])
          throw new BadRequestException('Backend.invalidInput');
        if (old && old.state !== 'in_progress')
          throw new ConflictException('Training.finished');
        const prescriptions = new Map(
          snapshot.days[input.dayIndex].exercises.map((e) => [e.id, e]),
        );
        for (const log of input.logs) {
          const p = prescriptions.get(log.prescriptionId);
          if (!p || log.set > p.sets)
            throw new BadRequestException('Training.invalidExercise');
          if (p.exerciseId !== log.exerciseId) {
            const [e] = await rows<{ alternatives: string[] }>(
              tx,
              sql`SELECT alternatives FROM training_exercises WHERE id=${p.exerciseId}`,
            );
            if (!e?.alternatives.includes(log.exerciseId))
              throw new BadRequestException('Training.invalidExercise');
          }
          if (
            log.done &&
            ((p.reps !== null && (log.reps === null || log.seconds !== null)) ||
              (p.seconds !== null &&
                (log.seconds === null || log.reps !== null)))
          )
            throw new BadRequestException('Backend.invalidInput');
        }
        if (input.state === 'completed' && !input.logs.some((l) => l.done))
          throw new BadRequestException('Training.logFirst');
        let shared = false;
        if (input.shared && relation) {
          const [r] = await rows<{
            status: string;
            coach_status: string;
            deletion_pending: boolean;
            deleted_at: Date | null;
          }>(
            tx,
            sql`SELECT r.status,c.status AS coach_status,c.deletion_pending,c.deleted_at FROM coaching_relationships r JOIN users c ON c.id=r.coach_id WHERE r.id=${relation} AND r.student_id=${actor} FOR SHARE OF r`,
          );
          shared =
            !!r &&
            r.status === 'active' &&
            r.coach_status === 'active' &&
            !r.deletion_pending &&
            !r.deleted_at;
        }
        const [result] = await rows(
          tx,
          sql`INSERT INTO training_sessions(id,athlete_id,assignment_id,relationship_id,snapshot,logs,day_index,state,shared,started_at,ended_at) VALUES(${input.id},${actor},${input.assignmentId},${relation},${JSON.stringify(snapshot)}::jsonb,${JSON.stringify(input.logs)}::jsonb,${input.dayIndex},${input.state},${shared},${input.startedAt},${input.state === 'in_progress' ? null : new Date()}) ON CONFLICT(id) DO UPDATE SET logs=EXCLUDED.logs,state=EXCLUDED.state,shared=EXCLUDED.shared,ended_at=EXCLUDED.ended_at,revision=training_sessions.revision+1,updated_at=now() RETURNING *`,
        );
        if (input.state === 'completed')
          await tx.execute(
            sql`INSERT INTO product_events(id,actor_id,name,entity_id) VALUES(${input.operationId},${actor},'workout_completed',${input.id}) ON CONFLICT DO NOTHING`,
          );
        return result;
      },
    );
  }
  async review(actor: string, id: string, input: z.infer<typeof c.reviewPlan>) {
    const authorize = async (tx: Tx) => {
      const [p] = await rows<PlanRow>(
        tx,
        sql`SELECT * FROM training_plans WHERE id=${id} AND owner_id=${actor} AND relationship_id IS NOT NULL`,
      );
      if (!p) throw new NotFoundException('Training.notFound');
      await trainingRelationship(tx, actor, p.relationship_id!, true);
    };
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['reviewPlan', id, input],
      async (tx) => {
        const [p] = await rows<PlanRow>(
          tx,
          sql`SELECT * FROM training_plans WHERE id=${id} AND owner_id=${actor} FOR UPDATE`,
        );
        if (!p) throw new NotFoundException('Training.notFound');
        if (p.revision !== input.revision)
          throw new ConflictException('Training.conflict');
        await approvedCoach(tx, actor);
        const [result] = await rows(
          tx,
          sql`UPDATE training_plans SET review_due_at=now()+interval '7 days',revision=revision+1,updated_at=now() WHERE id=${id} RETURNING id,revision,review_due_at`,
        );
        return result;
      },
      authorize,
    );
  }
  async sessionSharing(
    actor: string,
    id: string,
    input: z.infer<typeof c.sessionSharing>,
  ) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['sessionSharing', id, input],
      async (tx) => {
        const [s] = await rows<{
          relationship_id: string | null;
          revision: number;
        }>(
          tx,
          sql`SELECT relationship_id,revision FROM training_sessions WHERE id=${id} AND athlete_id=${actor} FOR UPDATE`,
        );
        if (!s) throw new NotFoundException('Training.notFound');
        if (s.revision !== input.revision)
          throw new ConflictException('Training.conflict');
        if (input.shared) {
          if (!s.relationship_id)
            throw new BadRequestException('Backend.invalidInput');
          await trainingRelationship(tx, actor, s.relationship_id, true);
        }
        const [result] = await rows(
          tx,
          sql`UPDATE training_sessions SET shared=${input.shared},revision=revision+1,updated_at=now() WHERE id=${id} RETURNING *`,
        );
        return result;
      },
    );
  }
  async progress(actor: string) {
    return {
      measurements: await rows(
        this.db,
        sql`SELECT * FROM training_measurements WHERE athlete_id=${actor} ORDER BY measured_on DESC LIMIT 200`,
      ),
      sessions: await rows(
        this.db,
        sql`SELECT id,snapshot,logs,day_index,started_at,ended_at,feedback FROM training_sessions WHERE athlete_id=${actor} AND state='completed' ORDER BY started_at DESC LIMIT 200`,
      ),
    };
  }
  async measure(actor: string, input: z.infer<typeof c.measurement>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['measurement', input],
      async (tx) => {
        const [v] = await rows(
          tx,
          sql`INSERT INTO training_measurements(athlete_id,kind,value,unit,measured_on) VALUES(${actor},${input.kind},${input.value},${input.kind === 'weight' ? 'kg' : 'cm'},${input.measuredOn}) ON CONFLICT(athlete_id,kind,measured_on) DO UPDATE SET value=EXCLUDED.value RETURNING *`,
        );
        return v;
      },
    );
  }
  async event(actor: string, input: z.infer<typeof c.event>) {
    await this.db.execute(
      sql`INSERT INTO product_events(id,actor_id,name,entity_id) SELECT ${input.id},${actor},${input.name},${input.entityId} WHERE (SELECT count(*) FROM product_events WHERE actor_id=${actor} AND occurred_at>now()-interval '1 hour')<500 ON CONFLICT DO NOTHING`,
    );
    return { success: true };
  }
}
