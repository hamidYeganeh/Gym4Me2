"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Timer, X, CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations, useLocale } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import {
  useTrainingQuery,
  type TrainingWorkspace,
  type Workout,
  type WorkoutCommand,
  type Exercise,
  type SetLog,
} from "@repo/api/profile";
import {
  loadTrainingLocal,
  saveTrainingLocal,
  trainingEpoch,
} from "@repo/api/training-offline";
import { Button } from "../kit/Button";
import { ErrorNotice, Loading } from "../account/common";
import {
  TrainingGate,
  useTrainingParams,
  TrainingCard,
  TrainingFeedback,
  TrainingLink,
  useTrainingOwner,
  useTrainingOnline,
  useTrainingAction,
  useTrainingLocale,
} from "./common";
import { replaceRemainingSets } from "./workout-state";
type LocalWorkout = {
  workout: Workout;
  pending: WorkoutCommand | null;
  dirty: boolean;
  restUntil: number | null;
};
export function TrainingWorkout() {
  const t = useTranslations("Training");
  return (
    <TrainingGate title={t("workout")}>
      <WorkoutContent />
    </TrainingGate>
  );
}
function WorkoutContent() {
  const params = useTrainingParams(),
    router = useRouter(),
    owner = useTrainingOwner(),
    online = useTrainingOnline(),
    t = useTranslations("Training"),
    locale = useLocale(),
    fmt = useTrainingLocale(),
    { api, resetSession } = useApiContext(),
    a = useTrainingAction();
  const query = useTrainingQuery<TrainingWorkspace>(
      "profile/training",
      {},
      online,
    ),
    lib = useTrainingQuery<Exercise[]>(
      "profile/training/exercises",
      {},
      online,
    );
  const [local, setLocal] = useState<LocalWorkout | null>(null),
    [library, setLibrary] = useState<Exercise[]>([]),
    [error, setError] = useState<unknown>(null),
    [conflict, setConflict] = useState(false),
    [seconds, setSeconds] = useState(0),
    [storageFailed, setStorageFailed] = useState(false),
    [confirm, setConfirm] = useState<"completed" | "discarded" | null>(null);
  const state = useRef<LocalWorkout | null>(null),
    busy = useRef(false),
    blocked = useRef(false),
    loaded = useRef(false),
    scope = useRef(trainingEpoch());
  const key = params.get("id"),
    assignment = params.get("assignment"),
    day = Math.max(0, Number(params.get("day") ?? 0));
  const own = () => trainingEpoch() === scope.current;
  async function persist(value: LocalWorkout) {
    if (!own()) return;
    state.current = value;
    setLocal(value);
    try {
      await saveTrainingLocal(
        owner,
        "workout",
        value.workout.id,
        value,
        scope.current,
      );
      await saveTrainingLocal(
        owner,
        "active",
        "current",
        value.workout.state === "in_progress" ? value.workout.id : null,
        scope.current,
      );
    } catch {
      setStorageFailed(true);
    }
  }
  useEffect(() => {
    if (loaded.current) return;
    let cancelled = false;
    void (async () => {
      const cached = key
        ? await loadTrainingLocal<LocalWorkout>(owner, "workout", key).catch(
            () => null,
          )
        : null;
      const workspace =
        query.data ??
        (await loadTrainingLocal<TrainingWorkspace>(
          owner,
          "workspace",
          "current",
        ).catch(() => null));
      if (cancelled || !own()) return;
      let initial = cached;
      const server = workspace?.sessions.find((s) => s.id === key);
      if (
        initial &&
        !initial.dirty &&
        !initial.pending &&
        server &&
        server.revision >= initial.workout.revision
      )
        initial = { ...initial, workout: server };
      if (!key) {
        const activeId = await loadTrainingLocal<string>(
          owner,
          "active",
          "current",
        ).catch(() => null);
        if (activeId)
          initial = await loadTrainingLocal<LocalWorkout>(
            owner,
            "workout",
            activeId,
          ).catch(() => null);
      }

      if (!initial && key) {
        const s = workspace?.sessions.find((s) => s.id === key);
        if (s)
          initial = {
            workout: s,
            pending: null,
            dirty: false,
            restUntil: null,
          };
      }
      if (!initial && !key && workspace) {
        const active = workspace.sessions.find(
          (s) => s.state === "in_progress",
        );
        if (active) {
          initial = (await loadTrainingLocal<LocalWorkout>(
            owner,
            "workout",
            active.id,
          ).catch(() => null)) ?? {
            workout: active,
            pending: null,
            dirty: false,
            restUntil: null,
          };
        } else {
          const source = workspace.assignments.find((v) => v.id === assignment);
          if (source?.content.days[day])
            initial = {
              workout: {
                id: crypto.randomUUID(),
                athleteId: owner,
                assignmentId: source.id,
                relationshipId: source.relationshipId,
                snapshot: source.content,
                dayIndex: day,
                logs: [],
                state: "in_progress",
                revision: 0,
                shared: false,
                startedAt: new Date().toISOString(),
                endedAt: null,
                feedback: "",
                reviewedAt: null,
              },
              pending: null,
              dirty: true,
              restUntil: null,
            };
        }
      }
      if (!initial) {
        if (workspace) {
          loaded.current = true;
          setError(new Error("Training.notFound"));
        }
        return;
      }
      loaded.current = true;
      await persist(initial);
      if (!key) router.replace(`/training/workout?id=${initial.workout.id}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, assignment, day, owner, query.data, router]);
  useEffect(() => {
    const current = state.current,
      server = query.data?.sessions.find((s) => s.id === current?.workout.id);
    if (
      current &&
      !current.dirty &&
      !current.pending &&
      server &&
      server.revision > current.workout.revision
    )
      void persist({ ...current, workout: server });
  }, [query.data]);
  useEffect(() => {
    if (lib.data) {
      setLibrary(lib.data);
      void saveTrainingLocal(owner, "library", "current", lib.data).catch(
        () => undefined,
      );
    } else
      void loadTrainingLocal<Exercise[]>(owner, "library", "current")
        .then((v) => {
          if (v) setLibrary(v);
        })
        .catch(() => undefined);
  }, [owner, lib.data]);
  async function sync() {
    if (!online || busy.current || blocked.current || !state.current || !own())
      return;
    let value = state.current;
    if (!value.dirty && !value.pending) return;
    busy.current = true;
    setError(null);
    try {
      const w = value.workout;
      const command = value.pending ?? {
        id: w.id,
        assignmentId: w.assignmentId,
        dayIndex: w.dayIndex,
        logs: w.logs,
        state: w.state,
        revision: w.revision,
        shared: w.shared,
        startedAt: w.startedAt,
        operationId: crypto.randomUUID(),
      };
      value = { ...value, pending: command, dirty: false };
      await persist(value);
      const response = await api.request<Workout>({
        method: "POST",
        path: "profile/training/sessions/sync",
        body: command,
      });
      if (!own()) return;
      const latest = state.current!;
      await persist({
        ...latest,
        workout: {
          ...latest.workout,
          revision: response.revision,
          shared:
            latest.workout.shared === command.shared
              ? response.shared
              : latest.workout.shared,
          relationshipId: response.relationshipId,
          feedback: response.feedback,
          reviewedAt: response.reviewedAt,
        },
        pending: null,
      });
    } catch (e) {
      if (!own()) return;
      setError(e);
      if (e && typeof e === "object" && "status" in e && e.status === 401) {
        await resetSession();
        return;
      }
      blocked.current = true;
      if (e && typeof e === "object" && "status" in e && e.status === 409)
        setConflict(true);
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    const timer = setInterval(() => void sync(), 1300);
    return () => clearInterval(timer);
  });
  useEffect(() => {
    if (online) {
      blocked.current = false;
      void sync();
    }
  }, [online]);
  useEffect(() => {
    const timer = setInterval(() => {
      const until = state.current?.restUntil;
      setSeconds(
        until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0,
      );
    }, 250);
    return () => clearInterval(timer);
  }, []);
  function change(update: (w: Workout) => void, rest?: number) {
    if (!state.current || !own()) return;
    const next = structuredClone(state.current);
    update(next.workout);
    next.dirty = true;
    if (rest !== undefined)
      next.restUntil = rest > 0 ? Date.now() + rest * 1000 : null;
    blocked.current = false;
    void persist(next);
  }
  async function resolve(keep: boolean) {
    const r = await query.refetch();
    const server =
      r.data?.sessions.find((w) => w.id === state.current?.workout.id) ??
      r.data?.sessions.find((w) => w.state === "in_progress");
    if (!server) return;
    if (
      keep &&
      (server.state !== "in_progress" ||
        server.id !== state.current?.workout.id)
    ) {
      const blob = new Blob([JSON.stringify(state.current?.workout, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "gym4me-workout-draft.json";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    await persist(
      keep
        ? {
            ...state.current!,
            workout: { ...state.current!.workout, revision: server.revision },
            pending: null,
            dirty: true,
          }
        : { workout: server, pending: null, dirty: false, restUntil: null },
    );
    if (server.id !== key) router.replace(`/training/workout?id=${server.id}`);
    setConflict(false);
    blocked.current = false;
    setError(null);
  }
  useEffect(() => {
    if (
      a.error &&
      typeof a.error === "object" &&
      "status" in a.error &&
      a.error.status === 409
    ) {
      setConflict(true);
      void query.refetch();
    }
  }, [a.error]);
  if (!local) return error ? <ErrorNotice error={error} /> : <Loading />;
  const w = local.workout,
    exercises = w.snapshot.days[w.dayIndex]!.exercises,
    total = exercises.reduce((n, e) => n + e.sets, 0),
    done = w.logs.filter((l) => l.done).length,
    finished = w.state !== "in_progress";
  const updateLog = (
    prescriptionId: string,
    set: number,
    exerciseId: string,
    patch: Partial<SetLog>,
    rest?: number,
  ) =>
    change((next) => {
      let row = next.logs.find(
        (l) => l.prescriptionId === prescriptionId && l.set === set,
      );
      if (!row) {
        row = {
          prescriptionId,
          set,
          exerciseId,
          reps: null,
          seconds: null,
          load: null,
          rpe: null,
          done: false,
        };
        next.logs.push(row);
      }
      Object.assign(row, patch);
    }, rest);
  return (
    <>
      <section className="training-hero">
        <h2>{w.snapshot.title}</h2>
        <p>{w.snapshot.days[w.dayIndex]!.name}</p>
        <p className="training-muted" role="status">
          {t(
            finished
              ? w.state === "completed"
                ? "completed"
                : "discarded"
              : "setsProgress",
            { done: fmt.number(done), total: fmt.number(total) },
          )}
        </p>
        <progress
          className="w-full"
          aria-label={t("progress")}
          value={done}
          max={total || 1}
        />
        <p className="training-muted" role="status">
          {t(
            local.pending || local.dirty
              ? online
                ? "syncing"
                : "draftOnDevice"
              : "synced",
          )}
        </p>
      </section>
      {storageFailed && (
        <p role="alert" className="training-notice">
          {t("localUnavailable")}
        </p>
      )}
      <ErrorNotice error={error} />
      <TrainingFeedback action={a} />
      {conflict && (
        <TrainingCard title={t("conflict")}>
          <p>{t("conflictHint")}</p>
          <div className="training-actions">
            <Button type="button" onClick={() => void resolve(false)}>
              {t("useServer")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void resolve(true)}
            >
              {t("keepOrDownloadDraft")}
            </Button>
          </div>
        </TrainingCard>
      )}
      {w.feedback && (
        <TrainingCard title={t("coachFeedback")}>
          <p>{w.feedback}</p>
        </TrainingCard>
      )}
      {exercises.map((p) => {
        const sample =
            w.logs.find((l) => l.prescriptionId === p.id && !l.done) ??
            w.logs.find((l) => l.prescriptionId === p.id),
          e = library.find(
            (e) => e.id === (sample?.exerciseId ?? p.exerciseId),
          ),
          original = library.find((e) => e.id === p.exerciseId);
        return (
          <TrainingCard key={p.id}>
            <div className="training-exercise-heading">
              {e && (
                <img
                  className="training-exercise-image"
                  src={e.illustration}
                  alt=""
                />
              )}
              <div>
                <h2>
                  {e ? (locale === "fa" ? e.nameFa : e.nameEn) : p.exerciseId}
                </h2>
                <p className="training-muted">
                  {p.group !== "single" ? `${t(p.group)} ${p.groupId} · ` : ""}
                  {fmt.number(p.sets)} × {fmt.number(p.reps ?? p.seconds ?? 0)}{" "}
                  {p.reps === null ? t("seconds") : t("reps")}
                </p>
              </div>
            </div>
            {p.note && <p>{p.note}</p>}
            <details>
              <summary>{t("instructions")}</summary>
              <p className="training-muted">
                {locale === "fa" ? e?.instructionFa : e?.instructionEn}
              </p>
              {!finished && !!original?.alternatives.length && (
                <label>
                  {t("alternative")}
                  <select
                    value={e?.id ?? p.exerciseId}
                    disabled={
                      w.logs.filter((l) => l.prescriptionId === p.id && l.done)
                        .length >= p.sets
                    }
                    onChange={(event) =>
                      change((next) => {
                        next.logs = replaceRemainingSets(
                          next.logs,
                          p,
                          event.target.value,
                        );
                      })
                    }
                  >
                    {[p.exerciseId, ...original.alternatives].map((id) => {
                      const ex = library.find((e) => e.id === id);
                      return (
                        <option key={id} value={id}>
                          {locale === "fa" ? ex?.nameFa : ex?.nameEn}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}
            </details>
            {Array.from({ length: p.sets }, (_, i) => i + 1).map((set) => {
              const row = w.logs.find(
                  (l) => l.prescriptionId === p.id && l.set === set,
                ),
                exerciseId = row?.exerciseId ?? e?.id ?? p.exerciseId;
              return (
                <Fragment key={set}>
                  {row?.exerciseId && row.exerciseId !== e?.id && (
                    <p className="training-muted">
                      {t("set")} {fmt.number(set)} ·{" "}
                      {locale === "fa"
                        ? (library.find((ex) => ex.id === row.exerciseId)
                            ?.nameFa ?? row.exerciseId)
                        : (library.find((ex) => ex.id === row.exerciseId)
                            ?.nameEn ?? row.exerciseId)}
                    </p>
                  )}
                  <div className="training-set" data-done={row?.done}>
                    <span className="training-set-number">
                      {fmt.number(set)}
                    </span>
                    <label>
                      {t(p.reps === null ? "seconds" : "reps")}
                      <input
                        aria-label={`${t("set")} ${set} ${t(p.reps === null ? "seconds" : "reps")}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={p.reps === null ? 86400 : 1000}
                        disabled={finished}
                        placeholder={String(p.reps ?? p.seconds ?? 0)}
                        value={
                          (p.reps === null ? row?.seconds : row?.reps) ?? ""
                        }
                        onChange={(event) =>
                          updateLog(
                            p.id,
                            set,
                            exerciseId,
                            p.reps === null
                              ? {
                                  seconds:
                                    event.target.value === ""
                                      ? null
                                      : Number(event.target.value),
                                }
                              : {
                                  reps:
                                    event.target.value === ""
                                      ? null
                                      : Number(event.target.value),
                                },
                          )
                        }
                      />
                    </label>
                    <label>
                      {t("load")}
                      <input
                        aria-label={`${t("set")} ${set} ${t("load")}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={1000}
                        step="0.5"
                        disabled={finished}
                        placeholder={String(p.load ?? 0)}
                        value={row?.load ?? ""}
                        onChange={(event) =>
                          updateLog(p.id, set, exerciseId, {
                            load:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      {t("rpe")}
                      <input
                        aria-label={`${t("set")} ${set} ${t("rpe")}`}
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={10}
                        step="0.5"
                        disabled={finished}
                        value={row?.rpe ?? ""}
                        onChange={(event) =>
                          updateLog(p.id, set, exerciseId, {
                            rpe:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      aria-label={`${t(row?.done ? "uncheckSet" : "completeSet")} ${set}`}
                      aria-pressed={!!row?.done}
                      disabled={finished}
                      size="icon"
                      variant={row?.done ? "secondary" : "outline"}
                      onClick={() => {
                        updateLog(
                          p.id,
                          set,
                          exerciseId,
                          {
                            done: !row?.done,
                            reps:
                              p.reps === null ? null : (row?.reps ?? p.reps),
                            seconds:
                              p.reps === null
                                ? (row?.seconds ?? p.seconds)
                                : null,
                            load: row?.load ?? p.load,
                          },
                          !row?.done ? p.restSeconds : undefined,
                        );
                      }}
                    >
                      <Check size={19} />
                    </Button>
                  </div>
                </Fragment>
              );
            })}
          </TrainingCard>
        );
      })}
      {!finished && (
        <>
          <p className="training-muted">{t("actualHint")}</p>
          {w.relationshipId && (
            <label className="training-check">
              <input
                type="checkbox"
                checked={w.shared}
                onChange={(e) =>
                  change((next) => {
                    next.shared = e.target.checked;
                  })
                }
              />
              {t("shareWorkout")}
            </label>
          )}
          <div className="training-actions">
            <Button
              type="button"
              disabled={!done || conflict}
              onClick={() => setConfirm("completed")}
            >
              <CheckCircle2 size={18} />
              {t("finish")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirm("discarded")}
            >
              {t("discard")}
            </Button>
          </div>
        </>
      )}
      {confirm && (
        <TrainingCard
          title={t(
            confirm === "completed" ? "confirmFinish" : "confirmDiscard",
          )}
        >
          <p>{t(confirm === "completed" ? "finishHint" : "discardHint")}</p>
          <div className="training-actions">
            <Button
              type="button"
              onClick={() => {
                change((next) => {
                  next.state = confirm;
                  next.endedAt = new Date().toISOString();
                });
                setConfirm(null);
              }}
            >
              {t("confirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(null)}
            >
              {t("cancel")}
            </Button>
          </div>
        </TrainingCard>
      )}
      {finished && w.relationshipId && (
        <label className="training-check">
          <input
            type="checkbox"
            checked={w.shared}
            disabled={!online || local.dirty || !!local.pending || a.pending}
            onChange={(e) => {
              const shared = e.target.checked;
              void a.run(async () => {
                const result = (await a.mutation.mutateAsync({
                  path: `profile/training/sessions/${w.id}/sharing`,
                  body: {
                    shared,
                    revision: w.revision,
                    operationId: crypto.randomUUID(),
                  },
                })) as Workout;
                await persist({
                  ...state.current!,
                  workout: result,
                  pending: null,
                  dirty: false,
                });
                setConflict(false);
                a.setError(null);
              });
            }}
          />
          {t("shareWorkout")}
        </label>
      )}
      {finished && (
        <TrainingLink href="/training">{t("backToTraining")}</TrainingLink>
      )}
      {!finished && seconds > 0 && (
        <div
          className="training-timer"
          role="timer"
          aria-label={t("restTimer")}
        >
          <Timer size={20} />
          <strong>
            {fmt.number(Math.floor(seconds / 60))}:
            {String(seconds % 60).padStart(2, "0")}
          </strong>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("addRest")}
            onClick={() =>
              void persist({
                ...state.current!,
                restUntil: (state.current?.restUntil ?? Date.now()) + 15000,
              })
            }
          >
            <RotateCcw size={17} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("skipRest")}
            onClick={() => void persist({ ...state.current!, restUntil: null })}
          >
            <X size={17} />
          </Button>
        </div>
      )}
      {!!error && !conflict && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            blocked.current = false;
            void sync();
          }}
        >
          {t("retry")}
        </Button>
      )}
    </>
  );
}
