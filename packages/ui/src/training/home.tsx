"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Dumbbell,
  ArrowUpRight,
  Plus,
  CalendarDays,
  MessageCircle,
} from "lucide-react";
import { useTranslations } from "@repo/i18n";
import {
  useTrainingQuery,
  type TrainingWorkspace,
  type Workout,
  type Exercise,
  type PlanContent,
} from "@repo/api/profile";
import {
  saveTrainingLocal,
  loadTrainingLocal,
  listTrainingLocal,
} from "@repo/api/training-offline";
import { Button } from "../kit/Button";
import { Loading, QueryError } from "../account/common";
import {
  TrainingGate,
  TrainingCard,
  TrainingEmpty,
  TrainingLink,
  useTrainingOwner,
  useTrainingLocale,
  useTrainingOnline,
  useTrainingEvent,
} from "./common";
import { TrainingProgressPanel } from "./progress";
import { useListState } from "../hooks/use-list-state";
import { SlidingSegments } from "../motion-controls";
export function TrainingHome() {
  const t = useTranslations("Training");
  return (
    <TrainingGate title={t("title")} back="/">
      <HomeContent />
    </TrainingGate>
  );
}
function PlanPreview({
  content,
  library,
}: {
  content: PlanContent;
  library: Exercise[];
}) {
  const t = useTranslations("Training");
  const exercises = content.days.flatMap((day) => day.exercises);
  const previews = [...new Set(exercises.map((item) => item.exerciseId))]
    .slice(0, 3)
    .map((id) => library.find((item) => item.id === id))
    .filter(Boolean);
  return (
    <div className="training-plan-preview">
      <span className="training-muted">
        {t("planSummary", {
          days: content.days.length,
          exercises: exercises.length,
        })}
      </span>
      <div className="training-plan-thumbnails" aria-hidden="true">
        {previews.map(
          (exercise) =>
            exercise && (
              <Image
                key={exercise.id}
                src={exercise.illustration}
                alt=""
                width={42}
                height={48}
                unoptimized
              />
            ),
        )}
      </div>
    </div>
  );
}
function HomeContent() {
  const t = useTranslations("Training"),
    owner = useTrainingOwner(),
    online = useTrainingOnline(),
    fmt = useTrainingLocale();
  useTrainingEvent("workout_opened");
  const [tab, setTab] = useListState(
    "tab",
    "today",
    (v): v is string => v === "today" || v === "plans" || v === "progress",
  );
  const [cached, setCached] = useState<TrainingWorkspace | null>(null);
  const [drafts, setDrafts] = useState<
    { workout: Workout; pending: unknown; dirty: boolean }[]
  >([]);
  const library = useTrainingQuery<Exercise[]>(
    "profile/training/exercises",
    {},
    online,
  );
  const q = useTrainingQuery<TrainingWorkspace>("profile/training", {}, online);
  useEffect(() => {
    void loadTrainingLocal<TrainingWorkspace>(owner, "workspace", "current")
      .then(setCached)
      .catch(() => undefined);
    void listTrainingLocal<{
      workout: Workout;
      pending: unknown;
      dirty: boolean;
    }>(owner, "workout")
      .then(setDrafts)
      .catch(() => undefined);
  }, [owner, q.data]);
  useEffect(() => {
    if (!library.data) return;
    void saveTrainingLocal(owner, "library", "current", library.data).catch(
      () => undefined,
    );
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.ready
        .then((reg) =>
          reg.active?.postMessage({
            type: "cache-training-assets",
            paths: library.data!.map((e) => e.illustration),
          }),
        )
        .catch(() => undefined);
  }, [owner, library.data]);
  useEffect(() => {
    if (q.data)
      void saveTrainingLocal(owner, "workspace", "current", q.data).catch(
        () => undefined,
      );
  }, [owner, q.data]);
  const d = q.data ?? (!online ? cached : null);
  if (!d)
    return q.error ? (
      <QueryError error={q.error} retry={q.refetch} />
    ) : (
      <Loading />
    );
  const pending = drafts.filter((item) => item.pending || item.dirty);
  const active =
      drafts.find((item) => item.workout.state === "in_progress")?.workout ??
      d.sessions.find(
        (s) =>
          s.state === "in_progress" &&
          !drafts.some(
            (item) =>
              item.workout.id === s.id && item.workout.state !== "in_progress",
          ),
      ) ??
      pending[0]?.workout,
    coaching = d.relationships.filter((r) => r.coachId === owner);
  return (
    <>
      <SlidingSegments
        className="training-tabs"
        label={t("title")}
        options={(["today", "plans", "progress"] as const).map((value) => ({
          value,
          label: t(value),
        }))}
        value={tab}
        onChange={setTab}
      />
      {pending.length > 0 && (
        <p className="training-notice" role="status">
          {t("pendingWorkouts", { count: pending.length })}
        </p>
      )}
      {tab === "today" && (
        <>
          <section className="training-hero">
            <div className="training-hero-icon">
              <Dumbbell size={28} />
            </div>
            <div>
              <h2>
                {active
                  ? t(
                      active.state === "in_progress"
                        ? "resumeTitle"
                        : "pendingSyncTitle",
                    )
                  : t("readyTitle")}
              </h2>
              <p className="training-muted">
                {active ? active.snapshot.title : t("todayHint")}
              </p>
            </div>
            {active ? (
              <Button type="button" asChild>
                <Link href={`/training/workout?id=${active.id}`}>
                  {t("resume")}
                  <ArrowUpRight size={18} />
                </Link>
              </Button>
            ) : d.assignments[0] ? (
              <Button type="button" asChild>
                <Link
                  href={`/training/workout?assignment=${d.assignments[0].id}&day=0`}
                >
                  {t("start")}
                  <ArrowUpRight size={18} />
                </Link>
              </Button>
            ) : (
              <Button type="button" asChild>
                <Link href="/training/plan">
                  {t("createFirst")}
                  <Plus size={18} />
                </Link>
              </Button>
            )}
          </section>
          {pending
            .filter((item) => item.workout.id !== active?.id)
            .map((item) => (
              <TrainingLink
                key={item.workout.id}
                href={`/training/workout?id=${item.workout.id}`}
              >
                {t("pendingSyncTitle")} · {item.workout.snapshot.title}
              </TrainingLink>
            ))}
          {!!d.relationships.length && (
            <TrainingCard title={t("collaboration")}>
              {d.relationships.map((r) => (
                <TrainingLink
                  key={r.id}
                  href={`/training/conversation?id=${r.id}`}
                >
                  <MessageCircle size={17} />
                  {r.displayName ||
                    t(r.coachId === owner ? "student" : "coach")}
                </TrainingLink>
              ))}
            </TrainingCard>
          )}
          {d.assignments.map((a) => (
            <TrainingCard
              key={a.id}
              title={a.content.title}
              className="training-plan-card"
            >
              <PlanPreview content={a.content} library={library.data ?? []} />
              <p className="training-muted">
                {t("version")} {fmt.number(a.version)} ·{" "}
                {a.relationshipId ? t("coachPlan") : t("personalPlan")}
              </p>
              <div className="training-day-list">
                {a.content.days.map((day, i) => (
                  <TrainingLink
                    key={i}
                    href={
                      active
                        ? `/training/workout?id=${active.id}`
                        : `/training/workout?assignment=${a.id}&day=${i}`
                    }
                  >
                    <CalendarDays size={16} />
                    {day.name}
                  </TrainingLink>
                ))}
              </div>
            </TrainingCard>
          ))}
          {!d.assignments.length && !active && (
            <TrainingEmpty>{t("noAssigned")}</TrainingEmpty>
          )}
          {!!coaching.length && (
            <TrainingCard title={t("coachWork")}>
              <p className="training-muted">{t("coachWorkHint")}</p>
              {coaching.map((r) => (
                <div key={r.id} className="training-actions">
                  <TrainingLink href={`/training/conversation?id=${r.id}`}>
                    {r.displayName || t("student")}
                  </TrainingLink>
                  <TrainingLink href={`/training/plan?relationship=${r.id}`}>
                    {t("assignPlan")}
                  </TrainingLink>
                  <p className="training-muted">
                    {t("followupCounts", {
                      workouts:
                        d.tasks?.find((x) => x.relationshipId === r.id)
                          ?.workouts ?? 0,
                      messages:
                        d.tasks?.find((x) => x.relationshipId === r.id)
                          ?.messages ?? 0,
                      plans:
                        d.tasks?.find((x) => x.relationshipId === r.id)
                          ?.plans ?? 0,
                      checkins:
                        d.tasks?.find((x) => x.relationshipId === r.id)
                          ?.checkins ?? 0,
                    })}
                  </p>
                </div>
              ))}
            </TrainingCard>
          )}
          {!!d.sessions.filter((s) => s.state === "completed").length && (
            <TrainingCard title={t("recent")}>
              {d.sessions
                .filter((s) => s.state === "completed")
                .slice(0, 4)
                .map((s) => (
                  <TrainingLink
                    key={s.id}
                    href={`/training/workout?id=${s.id}`}
                  >
                    {s.snapshot.title} · {fmt.date(s.startedAt)}
                  </TrainingLink>
                ))}
            </TrainingCard>
          )}
        </>
      )}
      {tab === "plans" && (
        <>
          <div className="training-actions">
            <Button type="button" asChild>
              <Link href="/training/plan">
                <Plus size={18} />
                {t("newPlan")}
              </Link>
            </Button>
            <TrainingLink href="/coaching">{t("coachSpace")}</TrainingLink>
          </div>
          {d.plans.length ? (
            d.plans.map((p) => (
              <TrainingCard key={p.id} title={p.title}>
                <p className="training-muted">
                  {p.isTemplate
                    ? t("template")
                    : p.relationshipId
                      ? t("coachPlan")
                      : t("personalPlan")}
                </p>
                <div className="training-actions">
                  <TrainingLink href={`/training/plan?id=${p.id}`}>
                    {t("edit")}
                  </TrainingLink>
                  <TrainingLink href={`/training/plan?copy=${p.id}`}>
                    {t("copy")}
                  </TrainingLink>
                </div>
              </TrainingCard>
            ))
          ) : (
            <TrainingEmpty>{t("noPlans")}</TrainingEmpty>
          )}
        </>
      )}
      {tab === "progress" && <TrainingProgressPanel />}
    </>
  );
}
