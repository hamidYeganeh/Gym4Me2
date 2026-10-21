"use client";
import { useEffect, useRef, useState } from "react";
import { useApiContext } from "@repo/api/provider";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Search, Check } from "lucide-react";
import { useTranslations, useLocale } from "@repo/i18n";
import {
  useTrainingQuery,
  type Exercise,
  type PlanContent,
  type TrainingPlan,
  type Prescription,
  type TrainingWorkspace,
} from "@repo/api/profile";
import {
  loadTrainingLocal,
  saveTrainingLocal,
  removeTrainingLocal,
  trainingEpoch,
} from "@repo/api/training-offline";
import { Button } from "../kit/Button";
import { Loading, QueryError } from "../account/common";
import {
  useTrainingParams,
  TrainingCard,
  TrainingGate,
  TrainingFeedback,
  useTrainingAction,
  useTrainingOwner,
  useTrainingOnline,
  trainingToday,
  TrainingLink,
} from "./common";
type Draft = {
  id: string;
  revision: number;
  content: PlanContent;
  relationshipId: string | null;
  isTemplate: boolean;
  pendingSave?: PlanSaveCommand;
  pendingPublish?: {
    operationId: string;
    revision: number;
    effectiveFrom: string;
  };
};
type PlanSaveCommand = Omit<Draft, "pendingSave" | "pendingPublish"> & {
  operationId: string;
};
function valid(d: Draft) {
  return (
    d.content.title.trim().length >= 2 &&
    d.content.days.length > 0 &&
    d.content.days.every((day) => day.name.trim() && day.exercises.length > 0)
  );
}
export function TrainingBuilder() {
  const t = useTranslations("Training");
  return (
    <TrainingGate title={t("planBuilder")}>
      <Builder />
    </TrainingGate>
  );
}
function Builder() {
  const params = useTrainingParams(),
    router = useRouter(),
    t = useTranslations("Training"),
    locale = useLocale(),
    owner = useTrainingOwner(),
    online = useTrainingOnline();
  const source = params.get("id") ?? params.get("copy"),
    copy = !!params.get("copy"),
    relationship = params.get("relationship");
  const q = useTrainingQuery<TrainingPlan>(
      `profile/training/plans/${source}`,
      {},
      !!source && online,
    ),
    library = useTrainingQuery<Exercise[]>(
      "profile/training/exercises",
      {},
      online,
    );
  const workspace = useTrainingQuery<TrainingWorkspace>(
    "profile/training",
    {},
    online,
  );
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [d, setD] = useState<Draft | null>(null),
    [step, setStep] = useState(0),
    [day, setDay] = useState(0),
    [search, setSearch] = useState(""),
    [picker, setPicker] = useState(false),
    [effective, setEffective] = useState(trainingToday),
    [dirty, setDirty] = useState(false),
    [localError, setLocalError] = useState(false);
  const { api } = useApiContext();
  const [cachedLibrary, setCachedLibrary] = useState<Exercise[]>([]);
  const scope = useRef(trainingEpoch());
  const a = useTrainingAction(),
    current = useRef<Draft | null>(null),
    busy = useRef(false),
    blocked = useRef(false),
    dirtyRef = useRef(false),
    initial = useRef(false),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (initial.current || (source && !q.data && online)) return;
    initial.current = true;
    void (async () => {
      const base: Draft = q.data
        ? {
            id: copy ? crypto.randomUUID() : q.data.id,
            revision: copy ? 0 : q.data.revision,
            relationshipId: copy ? relationship : q.data.relationshipId,
            isTemplate: copy ? false : q.data.isTemplate,
            content: structuredClone(
              q.data.draft ?? q.data.versions[0]!.content,
            ),
          }
        : {
            id: crypto.randomUUID(),
            revision: 0,
            relationshipId: relationship,
            isTemplate: false,
            content: {
              title: t("defaultTitle"),
              note: "",
              days: [{ name: t("dayOne"), exercises: [] }],
            },
          };
      if (copy) base.content.title += ` · ${t("copy")}`;
      const local = await loadTrainingLocal<Draft>(
        owner,
        "plan",
        source && !copy ? source : "new",
      ).catch(() => null);
      if (scope.current !== trainingEpoch()) return;
      if (source && !q.data && !local) {
        setLocalError(true);
        return;
      }
      if (source && local && !q.data) {
        current.current = local;
        setD(local);
        dirtyRef.current = true;
        setDirty(true);
        return;
      }
      const value =
        local &&
        (!source || local.id === source) &&
        local.relationshipId === base.relationshipId
          ? local
          : base;
      current.current = value;
      setD(value);
      if (local) {
        setDirty(true);
        dirtyRef.current = true;
      }
    })();
  }, [source, copy, q.data, relationship, t, owner, online]);
  useEffect(() => {
    if (library.data) setCachedLibrary(library.data);
    else
      void loadTrainingLocal<Exercise[]>(owner, "library", "current")
        .then((v) => {
          if (v) setCachedLibrary(v);
        })
        .catch(() => undefined);
  }, [owner, library.data]);
  function change(update: (v: Draft) => Draft) {
    if (
      !current.current ||
      scope.current !== trainingEpoch() ||
      current.current.pendingPublish
    )
      return;
    const next = update(structuredClone(current.current));
    current.current = next;
    setD(next);
    dirtyRef.current = true;
    setDirty(true);
    blocked.current = false;
    void saveTrainingLocal(
      owner,
      "plan",
      source && !copy ? source : "new",
      next,
      scope.current,
    ).catch(() => setLocalError(true));
  }
  async function save(focus = true): Promise<Draft | null> {
    const snapshot = current.current;
    if (
      scope.current !== trainingEpoch() ||
      !snapshot ||
      !!snapshot.pendingPublish ||
      !valid(snapshot) ||
      !online ||
      busy.current ||
      conflict
    )
      return null;
    busy.current = true;
    let result: Draft | null = null;
    const response = await a.run(async () => {
      const command: PlanSaveCommand = snapshot.pendingSave ?? {
        id: snapshot.id,
        revision: snapshot.revision,
        content: snapshot.content,
        relationshipId: snapshot.relationshipId,
        isTemplate: snapshot.isTemplate,
        operationId: crypto.randomUUID(),
      };
      const prepared = { ...snapshot, pendingSave: command };
      current.current = prepared;
      setD(prepared);
      await saveTrainingLocal(
        owner,
        "plan",
        source && !copy ? source : "new",
        prepared,
        scope.current,
      ).catch(() => setLocalError(true));
      const p = (await a.mutation.mutateAsync({
        path: "profile/training/plans",
        body: command,
      })) as TrainingPlan;
      if (scope.current !== trainingEpoch()) return false;

      const latest = current.current!;
      const next = { ...latest, revision: p.revision, pendingSave: undefined };
      current.current = next;
      setD(next);
      const stillDirty =
        JSON.stringify(latest.content) !== JSON.stringify(command.content) ||
        latest.isTemplate !== command.isTemplate;
      result = stillDirty ? null : next;
      dirtyRef.current = stillDirty;
      setDirty(stillDirty);
      await saveTrainingLocal(
        owner,
        "plan",
        source && !copy ? source : "new",
        next,
        scope.current,
      ).catch(() => setLocalError(true));
      return true;
    }, focus);
    if (!response) blocked.current = true;
    busy.current = false;
    return result;
  }
  useEffect(() => {
    if (
      a.error &&
      typeof a.error === "object" &&
      "status" in a.error &&
      a.error.status === 409
    )
      setConflict(true);
  }, [a.error]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current && !blocked.current) void save(false);
    }, 1400);
    return () => clearInterval(timer);
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  if (source && q.error && online && !d)
    return <QueryError error={q.error} retry={q.refetch} />;
  if (!d)
    return localError ? (
      <TrainingLink href="/training">{t("localUnavailable")}</TrainingLink>
    ) : (
      <Loading />
    );
  const active = d.content.days[day]!;
  const updatePrescription = (i: number, patch: Partial<Prescription>) =>
    change((v) => {
      Object.assign(v.content.days[day]!.exercises[i]!, patch);
      return v;
    });
  const title = (e: Exercise) => (locale === "fa" ? e.nameFa : e.nameEn);
  const exercises = library.data ?? cachedLibrary;
  return (
    <>
      <div className="training-steps" aria-label={t("builderSteps")}>
        {(["details", "movements", "reviewPublish"] as const).map(
          (label, i) => (
            <span key={label} aria-current={step === i ? "step" : undefined}>
              {i + 1}. {t(label)}
            </span>
          ),
        )}
      </div>
      <p className="training-muted" role="status">
        {localError
          ? t("localUnavailable")
          : dirty
            ? t(online ? "savingDraft" : "draftOnDevice")
            : d.revision
              ? t("draftSaved")
              : t("draftHint")}
      </p>
      {loadingTemplate && <Loading />}
      <TrainingFeedback action={a} />
      {conflict && (
        <TrainingCard title={t("conflict")}>
          <p>{t("conflictHint")}</p>
          <div className="training-actions">
            <Button
              type="button"
              onClick={async () => {
                const r = {
                  data: await api.request<TrainingPlan>({
                    method: "GET",
                    path: `profile/training/plans/${current.current!.id}`,
                  }),
                };
                if (r.data?.draft) {
                  const next = {
                    ...d,
                    revision: r.data.revision,
                    pendingSave: undefined,
                    pendingPublish: undefined,
                    content: r.data.draft,
                  };
                  current.current = next;
                  setD(next);
                  dirtyRef.current = false;
                  setDirty(false);
                  setConflict(false);
                  a.setError(null);
                }
              }}
            >
              {t("useServer")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const r = {
                  data: await api.request<TrainingPlan>({
                    method: "GET",
                    path: `profile/training/plans/${current.current!.id}`,
                  }),
                };
                if (r.data) {
                  const next = {
                    ...d,
                    revision: r.data.revision,
                    pendingSave: undefined,
                    pendingPublish: undefined,
                  };
                  current.current = next;
                  setD(next);
                  setConflict(false);
                  blocked.current = false;
                  dirtyRef.current = true;
                  a.setError(null);
                }
              }}
            >
              {t("keepDraft")}
            </Button>
          </div>
        </TrainingCard>
      )}
      {step === 0 && (
        <TrainingCard title={t("details")}>
          {!!workspace.data?.plans.some((p) => p.isTemplate) && (
            <label>
              {t("startFromTemplate")}
              <select
                defaultValue=""
                disabled={loadingTemplate || !online}
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) return;
                  setLoadingTemplate(true);
                  void api
                    .request<TrainingPlan>({
                      method: "GET",
                      path: `profile/training/plans/${id}`,
                    })
                    .then((template) =>
                      change((v) => {
                        v.content = structuredClone(
                          template.draft ?? template.versions[0]!.content,
                        );
                        v.content.title += ` · ${t("copy")}`;
                        return v;
                      }),
                    )
                    .catch(a.setError)
                    .finally(() => setLoadingTemplate(false));
                }}
              >
                <option value="">{t("blankPlan")}</option>
                {workspace.data.plans
                  .filter((p) => p.isTemplate)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            {t("planTitle")}
            <input
              value={d.content.title}
              disabled={loadingTemplate}
              maxLength={160}
              onChange={(e) =>
                change((v) => {
                  v.content.title = e.target.value;
                  return v;
                })
              }
            />
          </label>
          <label>
            {t("planNote")}
            <textarea
              value={d.content.note}
              disabled={loadingTemplate}
              maxLength={2000}
              onChange={(e) =>
                change((v) => {
                  v.content.note = e.target.value;
                  return v;
                })
              }
            />
          </label>
          {!d.relationshipId && (
            <label className="training-check">
              <input
                type="checkbox"
                checked={d.isTemplate}
                onChange={(e) =>
                  change((v) => {
                    v.isTemplate = e.target.checked;
                    return v;
                  })
                }
              />
              {t("saveAsTemplate")}
            </label>
          )}
          <p className="training-muted">
            {t(d.relationshipId ? "forStudent" : "forYourself")}
          </p>
        </TrainingCard>
      )}
      {step === 1 && (
        <>
          <div className="training-day-list">
            {d.content.days.map((v, i) => (
              <Button
                type="button"
                variant={day === i ? "secondary" : "outline"}
                key={i}
                onClick={() => setDay(i)}
              >
                {v.name}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={d.content.days.length >= 14}
              onClick={() => {
                change((v) => {
                  v.content.days.push({
                    name: `${t("day")} ${v.content.days.length + 1}`,
                    exercises: [],
                  });
                  return v;
                });
                setDay(d.content.days.length);
              }}
            >
              <Plus size={16} />
              {t("addDay")}
            </Button>
          </div>
          <TrainingCard>
            <div className="training-actions">
              <label className="flex-1">
                {t("dayName")}
                <input
                  value={active.name}
                  maxLength={100}
                  onChange={(e) =>
                    change((v) => {
                      v.content.days[day]!.name = e.target.value;
                      return v;
                    })
                  }
                />
              </label>
              {d.content.days.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("removeDay")}
                  onClick={() => {
                    change((v) => {
                      v.content.days.splice(day, 1);
                      return v;
                    });
                    setDay(0);
                  }}
                >
                  <Trash2 size={18} />
                </Button>
              )}
            </div>
          </TrainingCard>
          {active.exercises.map((p, i) => {
            const exercise = exercises.find((e) => e.id === p.exerciseId);
            return (
              <TrainingCard
                key={p.id}
                title={exercise ? title(exercise) : p.exerciseId}
                actions={
                  <div className="training-actions">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={i === 0}
                      aria-label={t("moveUp")}
                      onClick={() =>
                        change((v) => {
                          const list = v.content.days[day]!.exercises;
                          [list[i - 1], list[i]] = [list[i]!, list[i - 1]!];
                          return v;
                        })
                      }
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={i === active.exercises.length - 1}
                      aria-label={t("moveDown")}
                      onClick={() =>
                        change((v) => {
                          const list = v.content.days[day]!.exercises;
                          [list[i + 1], list[i]] = [list[i]!, list[i + 1]!];
                          return v;
                        })
                      }
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t("removeExercise")}
                      onClick={() =>
                        change((v) => {
                          v.content.days[day]!.exercises.splice(i, 1);
                          return v;
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                }
              >
                <div className="training-grid">
                  <label>
                    {t("sets")}
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={p.sets}
                      onChange={(e) =>
                        updatePrescription(i, { sets: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    {t("targetType")}
                    <select
                      value={p.reps === null ? "time" : "reps"}
                      onChange={(e) =>
                        updatePrescription(
                          i,
                          e.target.value === "time"
                            ? { reps: null, seconds: 30 }
                            : { reps: 10, seconds: null },
                        )
                      }
                    >
                      <option value="reps">{t("reps")}</option>
                      <option value="time">{t("seconds")}</option>
                    </select>
                  </label>
                  <label>
                    {t(p.reps === null ? "seconds" : "reps")}
                    <input
                      type="number"
                      min={1}
                      max={p.reps === null ? 7200 : 500}
                      value={p.reps ?? p.seconds ?? 0}
                      onChange={(e) =>
                        updatePrescription(
                          i,
                          p.reps === null
                            ? { seconds: Number(e.target.value) }
                            : { reps: Number(e.target.value) },
                        )
                      }
                    />
                  </label>
                  <label>
                    {t("load")}
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step="0.5"
                      value={p.load ?? ""}
                      onChange={(e) =>
                        updatePrescription(i, {
                          load:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    {t("restSeconds")}
                    <input
                      type="number"
                      min={0}
                      max={1800}
                      value={p.restSeconds}
                      onChange={(e) =>
                        updatePrescription(i, {
                          restSeconds: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <details>
                  <summary>{t("advanced")}</summary>
                  <div className="training-grid">
                    <label>
                      {t("group")}
                      <select
                        value={p.group}
                        onChange={(e) =>
                          updatePrescription(i, {
                            group: e.target.value as Prescription["group"],
                            groupId:
                              e.target.value === "single"
                                ? ""
                                : p.groupId || "A",
                          })
                        }
                      >
                        {(["single", "superset", "circuit"] as const).map(
                          (x) => (
                            <option key={x} value={x}>
                              {t(x)}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    {p.group !== "single" && (
                      <label>
                        {t("groupName")}
                        <input
                          maxLength={80}
                          value={p.groupId}
                          onChange={(e) =>
                            updatePrescription(i, { groupId: e.target.value })
                          }
                        />
                      </label>
                    )}
                    <label className="training-field-wide">
                      {t("exerciseNote")}
                      <textarea
                        maxLength={2000}
                        value={p.note}
                        onChange={(e) =>
                          updatePrescription(i, { note: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </details>
              </TrainingCard>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => setPicker(!picker)}
          >
            <Plus size={18} />
            {t("addExercise")}
          </Button>
          {picker && (
            <TrainingCard title={t("library")}>
              <label>
                <span className="training-actions">
                  <Search size={16} />
                  {t("searchExercise")}
                </span>
                <input
                  type="search"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {library.error && (
                <QueryError error={library.error} retry={library.refetch} />
              )}
              <div className="training-root">
                {exercises
                  .filter((e) =>
                    `${e.nameFa} ${e.nameEn} ${e.equipment}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((e) => (
                    <div key={e.id} className="training-exercise-heading">
                      <img
                        src={e.illustration}
                        alt=""
                        className="training-exercise-image"
                      />
                      <div className="flex-1">
                        <h3>{title(e)}</h3>
                        <p className="training-muted">
                          {t(
                            e.equipment as
                              "bodyweight" | "dumbbell" | "mat" | "band",
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        aria-label={`${t("addExercise")} ${title(e)}`}
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          change((v) => {
                            v.content.days[day]!.exercises.push({
                              id: crypto.randomUUID(),
                              exerciseId: e.id,
                              sets: 3,
                              reps: e.id === "plank" ? null : 10,
                              seconds: e.id === "plank" ? 30 : null,
                              load: null,
                              restSeconds: 60,
                              note: "",
                              group: "single",
                              groupId: "",
                            });
                            return v;
                          });
                          setPicker(false);
                          setSearch("");
                        }}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  ))}
              </div>
            </TrainingCard>
          )}
        </>
      )}
      {step === 2 && (
        <TrainingCard title={d.content.title}>
          <p>{d.content.note}</p>
          {d.content.days.map((v, i) => (
            <div key={i}>
              <h3>{v.name}</h3>
              <p className="training-muted">
                {v.exercises
                  .map((p) => {
                    const e = exercises.find((e) => e.id === p.exerciseId);
                    return `${e ? title(e) : p.exerciseId} · ${p.sets} × ${p.reps ?? p.seconds}`;
                  })
                  .join("، ")}
              </p>
            </div>
          ))}
          {!d.isTemplate && (
            <label>
              {t("effectiveFrom")}
              <input
                type="date"
                value={effective}
                required
                onChange={(e) => setEffective(e.target.value)}
              />
            </label>
          )}
          <p className="training-muted">
            {t(d.isTemplate ? "templateHint" : "publishHint")}
          </p>
        </TrainingCard>
      )}
      <div className="training-actions">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
          >
            {t("previous")}
          </Button>
        )}
        {step < 2 ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={
              loadingTemplate ||
              (step === 0 ? d.content.title.trim().length < 2 : !valid(d))
            }
          >
            {t("next")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={
              loadingTemplate || !valid(d) || a.pending || !online || conflict || !effective
            }
            onClick={() => {
              void (async () => {
                const saved = d.pendingPublish
                  ? d
                  : dirtyRef.current || !d.revision
                    ? await save(false)
                    : d;
                if (!saved) return;
                await a.run(async () => {
                  if (!saved.isTemplate) {
                    const command = saved.pendingPublish ?? {
                      revision: saved.revision,
                      effectiveFrom: effective,
                      operationId: crypto.randomUUID(),
                    };
                    const prepared = { ...saved, pendingPublish: command };
                    current.current = prepared;
                    setD(prepared);
                    await saveTrainingLocal(
                      owner,
                      "plan",
                      source && !copy ? source : "new",
                      prepared,
                      scope.current,
                    ).catch(() => setLocalError(true));
                    await a.mutation.mutateAsync({
                      path: `profile/training/plans/${saved.id}/publish`,
                      body: command,
                    });
                  }
                  dirtyRef.current = false;
                  await removeTrainingLocal(
                    owner,
                    "plan",
                    source && !copy ? source : "new",
                  ).catch(() => undefined);
                  router.push("/training");
                });
              })();
            }}
          >
            <Check size={18} />
            {t(d.isTemplate ? "saveTemplate" : "publish")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={loadingTemplate || !valid(d) || !online || a.pending}
          onClick={() => {
            blocked.current = false;
            void save();
          }}
        >
          {t("saveDraft")}
        </Button>
      </div>
      <TrainingLink href="/training">{t("backToTraining")}</TrainingLink>
    </>
  );
}
