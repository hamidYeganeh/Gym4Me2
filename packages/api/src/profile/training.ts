"use client";
import { useApiQuery, useApiMutation } from "../query";
export type Prescription = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number | null;
  seconds: number | null;
  load: number | null;
  restSeconds: number;
  note: string;
  group: "single" | "superset" | "circuit";
  groupId: string;
};
export type PlanContent = {
  title: string;
  note: string;
  nutrition?: string;
  days: { name: string; exercises: Prescription[] }[];
};
export type Exercise = {
  id: string;
  nameFa: string;
  nameEn: string;
  equipment: string;
  tags: string[];
  instructionFa: string;
  instructionEn: string;
  alternatives: string[];
  illustration: string;
  source: string;
  videoUrl?: string | null;
  videoSource?: string | null;
  videoRevision?: number;
  videoCaptionFa?: string|null;
  videoCaptionEn?: string|null;
};
export type PlanSummary = {
  id: string;
  title: string;
  revision: number;
  isTemplate: boolean;
  ownerId: string;
  relationshipId: string | null;
  updatedAt: string;
};
export type TrainingPlan = PlanSummary & {
  draft: PlanContent | null;
  canEdit: boolean;
  versions: {
    id: string;
    content: PlanContent;
    version: number;
    effectiveFrom: string;
  }[];
};
export type Assignment = {
  id: string;
  relationshipId: string | null;
  versionId: string;
  planId: string;
  version: number;
  content: PlanContent;
  effectiveFrom: string;
};
export type SetLog = {
  prescriptionId: string;
  exerciseId: string;
  set: number;
  reps: number | null;
  seconds: number | null;
  load: number | null;
  rpe: number | null;
  done: boolean;
};
export type Workout = {
  id: string;
  athleteId: string;
  assignmentId: string | null;
  relationshipId: string | null;
  snapshot: PlanContent;
  logs: SetLog[];
  dayIndex: number;
  state: "in_progress" | "completed" | "discarded";
  revision: number;
  shared: boolean;
  startedAt: string;
  endedAt: string | null;
  feedback: string;
  reviewedAt: string | null;
};
export type WorkoutCommand = {
  id: string;
  assignmentId: string | null;
  dayIndex: number;
  logs: SetLog[];
  state: Workout["state"];
  revision: number;
  shared: boolean;
  startedAt: string;
  operationId: string;
};
export type TrainingRelation = {
  id: string;
  coachId: string;
  studentId: string;
  status: string;
  displayName: string | null;
  personalPlans: boolean;
  measurements: boolean;
};
export type TrainingWorkspace = {
  actorId: string;
  plans: PlanSummary[];
  assignments: Assignment[];
  sessions: Workout[];
  relationships: TrainingRelation[];
  tasks: {
    relationshipId: string;
    workouts: number;
    checkins: number;
    plans: number;
    messages: number;
  }[];
  capabilities: { privateVideo: false };
};
export type Measurement = {
  id: string;
  kind: "weight" | "waist" | "chest" | "hip";
  value: string;
  unit: "kg" | "cm";
  measuredOn: string;
};
export type TrainingProgress = {
  measurements: Measurement[];
  sessions: Pick<
    Workout,
    | "id"
    | "snapshot"
    | "logs"
    | "dayIndex"
    | "startedAt"
    | "endedAt"
    | "feedback"
  >[];
};
export type AdaptivePreferences = {
  goal: "general" | "strength" | "hypertrophy";
  experience: "beginner" | "intermediate" | "advanced";
  minutes: number;
  equipment: ("bodyweight" | "dumbbell" | "band" | "mat")[];
  avoidMuscles: (
    "legs" | "chest" | "arms" | "back" | "core" | "shoulders" | "cardio"
  )[];
  excludeExercises: string[];
};
export type AdaptiveRecommendation = {
  id: string;
  expiresAt: string;
  status: "ready" | "rest" | "noExercises";
  estimatedMinutes: number;
  historySessions: number;
  recentlyTrained: string[];
  content: PlanContent | null;
  movements: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    seconds: number | null;
    load: number | null;
    restSeconds: number;
    reason:
      "firstSession" | "maintain" | "progress" | "reduce" | "recentlyTrained";
    evidenceSessionIds: string[];
  }[];
};
export function useAdaptivePreview() {
  return useApiMutation<
    AdaptiveRecommendation,
    { operationId: string; preferences: AdaptivePreferences }
  >(
    (api, body) =>
      api.request({
        method: "POST",
        path: "profile/training/recommendations",
        body,
      }),
    [],
  );
}
export function useAcceptAdaptive() {
  return useApiMutation<
    { planId: string; assignmentId: string },
    { id: string; operationId: string }
  >(
    (api, { id, operationId }) =>
      api.request({
        method: "POST",
        path: `profile/training/recommendations/${id}/accept`,
        body: { operationId },
      }),
    [["training"]],
  );
}
export type NutritionEntryInput = {
  operationId: string;
  eatenOn: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  grams: number;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
};
export type NutritionDay = {
  date: string;
  totals: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    entries: number;
  };
  entries: {
    id: string;
    eatenOn: string;
    meal: NutritionEntryInput["meal"];
    name: string;
    grams: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    revision: number;
  }[];
  hasMore: boolean;
};
export function useNutritionEntry() {
  return useApiMutation<{ id: string }, NutritionEntryInput>(
    (api, body) =>
      api.request({ method: "POST", path: "profile/nutrition/entries", body }),
    [["training"]],
  );
}
export function useRemoveNutrition() {
  return useApiMutation<
    { id: string },
    { id: string; revision: number; operationId: string }
  >(
    (api, { id, ...body }) =>
      api.request({
        method: "POST",
        path: `profile/nutrition/entries/${id}/remove`,
        body,
      }),
    [["training"]],
  );
}
export type WeeklyCheckin = {
  id: string;
  weekStart: string;
  adherence: number;
  difficulty: number;
  body: string;
  feedback: string;
  revision: number;
};
export type Collaboration = {
  relationship: {
    id: string;
    coachId: string;
    studentId: string;
    status: string;
  };
  sharing: { personalPlans: boolean; measurements: boolean };
  sessions: Workout[];
  plans: {
    id: string;
    title: string;
    content: PlanContent;
    version: number;
    revision: number;
    reviewDueAt: string | null;
    canReview: boolean;
  }[];
  measurements: Measurement[];
  checkins: WeeklyCheckin[];
};
export type TrainingMessage = {
  id: string;
  senderId: string | null;
  body: string;
  workoutId: string | null;
  hasImage: boolean;
  createdAt: string;
};
export type TrainingMessagePage = {
  items: TrainingMessage[];
  hasMore: boolean;
  peerReadAt: string | null;
};
export function useTrainingQuery<T>(
  path: string,
  query: Record<string, string | undefined> = {},
  enabled = true,
) {
  return useApiQuery(
    (scope) => [...scope, "training", path, query],
    (api, signal) => api.request<T>({ method: "GET", path, query }, { signal }),
    enabled,
    path === "profile/training/home-summary" ? 30_000 : 0,
  );
}
export function useTrainingCommand() {
  return useApiMutation(
    (api, input: { path: string; body?: unknown }) =>
      api.request<unknown>({
        method: "POST",
        path: input.path,
        ...(input.body === undefined ? {} : { body: input.body }),
      }),
    [["training"], ["sports"]],
  );
}
