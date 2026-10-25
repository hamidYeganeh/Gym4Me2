import { z } from 'zod';
export const operation = z.object({ operationId: z.uuid() });
const text = z.string().trim().max(2000);
const prescription = z
  .object({
    id: z.uuid(),
    exerciseId: z.string().min(1).max(80),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(1).max(500).nullable(),
    seconds: z.number().int().min(1).max(7200).nullable(),
    load: z.number().min(0).max(1000).nullable(),
    restSeconds: z.number().int().min(0).max(1800),
    note: text,
    group: z.enum(['single', 'superset', 'circuit']),
    groupId: z.string().max(80),
  })
  .strict()
  .refine((v) => (v.reps !== null) !== (v.seconds !== null));
export const planContent = z
  .object({
    title: z.string().trim().min(2).max(160),
    note: text,
    days: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            exercises: z.array(prescription).min(1).max(50),
          })
          .strict(),
      )
      .min(1)
      .max(14),
    nutrition: z.string().trim().max(10000).optional(),
  })
  .strict()
  .refine((v) => {
    const ids = v.days.flatMap((d) => d.exercises.map((e) => e.id));
    return new Set(ids).size === ids.length;
  });
export type PlanContent = z.infer<typeof planContent>;
export const savePlan = operation
  .extend({
    id: z.uuid(),
    revision: z.number().int().min(0),
    content: planContent,
    relationshipId: z.uuid().nullable(),
    isTemplate: z.boolean(),
  })
  .strict();
export const publishPlan = operation
  .extend({
    revision: z.number().int().positive(),
    effectiveFrom: z.iso.date(),
  })
  .strict();
export const setLog = z
  .object({
    prescriptionId: z.uuid(),
    exerciseId: z.string().min(1).max(80),
    set: z.number().int().min(1).max(20),
    reps: z.number().int().min(0).max(1000).nullable(),
    seconds: z.number().int().min(0).max(86400).nullable(),
    load: z.number().min(0).max(1000).nullable(),
    rpe: z.number().min(1).max(10).nullable(),
    done: z.boolean(),
  })
  .strict();
export const syncSession = operation
  .extend({
    id: z.uuid(),
    revision: z.number().int().min(0),
    assignmentId: z.uuid().nullable(),
    dayIndex: z.number().int().min(0).max(13),
    logs: z.array(setLog).max(1000),
    state: z.enum(['in_progress', 'completed', 'discarded']),
    shared: z.boolean(),
    startedAt: z.iso.datetime(),
  })
  .strict()
  .refine((v) => {
    const keys = v.logs.map((l) => `${l.prescriptionId}:${l.set}`);
    return new Set(keys).size === keys.length;
  });
export const measurement = operation
  .extend({
    kind: z.enum(['weight', 'waist', 'chest', 'hip']),
    value: z.number().positive().max(1000),
    measuredOn: z.iso.date(),
  })
  .strict();
export const share = z
  .object({ personalPlans: z.boolean(), measurements: z.boolean() })
  .strict();
export const message = operation
  .extend({ body: text, workoutId: z.uuid().nullable() })
  .strict()
  .refine((v) => v.body.length > 0);
export const weekly = operation
  .extend({
    weekStart: z.iso.date(),
    adherence: z.number().int().min(0).max(7),
    difficulty: z.number().int().min(1).max(10),
    body: text,
    revision: z.number().int().min(0),
  })
  .strict();
export const feedback = operation
  .extend({
    body: z.string().trim().min(1).max(2000),
    revision: z.number().int().positive(),
  })
  .strict();
export const event = z
  .object({
    id: z.uuid(),
    name: z.enum([
      'discovery_searched',
      'service_selected',
      'checkout_opened',
      'workout_opened',
    ]),
    entityId: z.uuid().nullable(),
  })
  .strict();
export const page = z
  .object({
    before: z.iso.datetime().optional(),
    search: z.string().max(100).optional(),
  })
  .strict();

export const sessionSharing = operation
  .extend({ shared: z.boolean(), revision: z.number().int().positive() })
  .strict();

export const reviewPlan = operation
  .extend({ revision: z.number().int().positive() })
  .strict();
