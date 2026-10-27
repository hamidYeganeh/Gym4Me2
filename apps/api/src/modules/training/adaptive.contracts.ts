import { z } from 'zod';

export const equipment = ['bodyweight', 'dumbbell', 'band', 'mat'] as const;
export const muscleGroups = [
  'legs',
  'chest',
  'arms',
  'back',
  'core',
  'shoulders',
  'cardio',
] as const;
export const preferences = z
  .object({
    goal: z.enum(['general', 'strength', 'hypertrophy']),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    minutes: z.number().int().min(15).max(90),
    equipment: z
      .array(z.enum(equipment))
      .min(1)
      .max(4)
      .refine((v) => new Set(v).size === v.length),
    avoidMuscles: z
      .array(z.enum(muscleGroups))
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    excludeExercises: z.array(z.string().min(1).max(80)).max(100),
  })
  .strict();
export type Preferences = z.infer<typeof preferences>;
export const generate = z
  .object({ operationId: z.uuid(), preferences })
  .strict();
export const accept = z.object({ operationId: z.uuid() }).strict();
