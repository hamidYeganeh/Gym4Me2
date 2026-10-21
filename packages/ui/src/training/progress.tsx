"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useTrainingQuery,
  type TrainingProgress,
  type Measurement,
  type Exercise,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { Loading, QueryError } from "../account/common";
import {
  TrainingCard,
  TrainingEmpty,
  TrainingLink,
  TrainingFeedback,
  useTrainingAction,
  useTrainingLocale,
  trainingToday,
} from "./common";
export function TrainingProgressPanel() {
  const t = useTranslations("Training"),
    fmt = useTrainingLocale(),
    q = useTrainingQuery<TrainingProgress>("profile/training/progress"),
    a = useTrainingAction();
  const library = useTrainingQuery<Exercise[]>("profile/training/exercises");
  const [exerciseId, setExerciseId] = useState("");
  const [metric, setMetric] = useState<"load" | "reps" | "seconds">("load");
  const [kind, setKind] = useState<Measurement["kind"]>("weight"),
    [value, setValue] = useState(""),
    [date, setDate] = useState(trainingToday);
  if (q.isPending) return <Loading />;
  if (q.error) return <QueryError error={q.error} retry={q.refetch} />;
  const d = q.data!,
    sessions = d.sessions,
    history = d.measurements
      .filter((m) => m.kind === kind)
      .slice(0, 12)
      .reverse();
  const record = new Map<string, number>();
  for (const s of sessions)
    for (const log of s.logs) {
      if (log.done && log.load !== null)
        record.set(
          log.exerciseId,
          Math.max(record.get(log.exerciseId) ?? 0, log.load),
        );
    }
  const exercises = [
    ...new Set(
      sessions.flatMap((s) =>
        s.logs.filter((l) => l.done).map((l) => l.exerciseId),
      ),
    ),
  ];
  const selectedExercise = exercises.includes(exerciseId)
    ? exerciseId
    : exercises[0];
  const performance = sessions
    .flatMap((s) => {
      const values = s.logs
        .filter(
          (l) =>
            l.done && l.exerciseId === selectedExercise && l[metric] !== null,
        )
        .map((l) => l[metric] as number);
      return values.length
        ? [{ id: s.id, date: s.startedAt, value: Math.max(...values) }]
        : [];
    })
    .slice(0, 12)
    .reverse();
  const unit = metric === "load" ? "kg" : metric;
  return (
    <>
      <TrainingFeedback action={a} />
      <TrainingCard title={t("progress")}>
        <p>{t("completedCount", { count: fmt.number(sessions.length) })}</p>
        <p className="training-muted">{t("progressHint")}</p>
        {!!record.size && (
          <dl className="training-grid">
            {[...record].slice(0, 8).map(([name, max]) => (
              <div key={name}>
                <dt>
                  {fmt.locale === "fa"
                    ? library.data?.find((e) => e.id === name)?.nameFa
                    : library.data?.find((e) => e.id === name)?.nameEn}
                </dt>
                <dd>
                  {fmt.number(max)} {t("kg")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </TrainingCard>
      <TrainingCard title={t("performanceChart")}>
        <p className="training-muted">{t("performanceHint")}</p>
        <div className="training-grid">
          <label>
            {t("movement")}
            <select
              value={selectedExercise ?? ""}
              onChange={(e) => setExerciseId(e.target.value)}
              disabled={!exercises.length}
            >
              {!exercises.length && <option value="">{t("noWorkouts")}</option>}
              {exercises.map((id) => (
                <option key={id} value={id}>
                  {fmt.locale === "fa"
                    ? library.data?.find((e) => e.id === id)?.nameFa
                    : library.data?.find((e) => e.id === id)?.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("performanceMetric")}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              {(["load", "reps", "seconds"] as const).map((key) => (
                <option key={key} value={key}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {performance.length ? (
          <>
            <div
              className="training-chart"
              role="img"
              aria-label={`${t("performanceChart")} · ${t(unit)}`}
            >
              {performance.map((point) => (
                <div className="training-bar" key={point.id}>
                  <strong>{fmt.number(point.value)}</strong>
                  <span
                    style={{
                      height: `${(point.value / Math.max(1, ...performance.map((v) => v.value))) * 75}%`,
                    }}
                  />
                  <small>{fmt.date(point.date)}</small>
                </div>
              ))}
            </div>
            <details>
              <summary>{t("showValues")}</summary>
              <dl>
                {performance.map((point) => (
                  <div className="training-card-heading" key={point.id}>
                    <dt>{fmt.date(point.date)}</dt>
                    <dd>
                      {fmt.number(point.value)} {t(unit)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        ) : (
          <TrainingEmpty>{t("noMetricData")}</TrainingEmpty>
        )}
      </TrainingCard>
      <TrainingCard title={t("measurements")}>
        <p className="training-muted">{t("measurementHint")}</p>
        <label>
          {t("measurementType")}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Measurement["kind"])}
          >
            {(["weight", "waist", "chest", "hip"] as const).map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        {history.length ? (
          <>
            <div
              className="training-chart"
              role="img"
              aria-label={t("measurementChart")}
            >
              {history.map((m) => (
                <div className="training-bar" key={m.id}>
                  <strong>{fmt.number(Number(m.value))}</strong>
                  <span
                    style={{
                      height: `${(Number(m.value) / Math.max(...history.map((v) => Number(v.value)))) * 75}%`,
                    }}
                  />
                  <small>{fmt.date(m.measuredOn)}</small>
                </div>
              ))}
            </div>
            <details>
              <summary>{t("showValues")}</summary>
              <dl>
                {history.map((m) => (
                  <div key={m.id} className="training-card-heading">
                    <dt>{fmt.date(m.measuredOn)}</dt>
                    <dd>
                      {fmt.number(Number(m.value))}{" "}
                      {t(kind === "weight" ? "kg" : "cm")}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        ) : (
          <TrainingEmpty>{t("noMeasurements")}</TrainingEmpty>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void a.run(async () => {
              await a.mutation.mutateAsync({
                path: "profile/training/measurements",
                body: {
                  kind,
                  value: Number(value),
                  measuredOn: date,
                  operationId: crypto.randomUUID(),
                },
              });
              setValue("");
            });
          }}
          className="training-root"
        >
          <div className="training-grid">
            <label>
              {t("value")} · {t(kind === "weight" ? "kg" : "cm")}
              <input
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                inputMode="decimal"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label>
              {t("date")}
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <Button type="submit" disabled={a.pending}>
            {t("recordMeasurement")}
          </Button>
        </form>
      </TrainingCard>
      <TrainingCard title={t("history")}>
        {sessions.length ? (
          sessions.map((s) => (
            <div key={s.id}>
              <TrainingLink href={`/training/workout?id=${s.id}`}>
                {s.snapshot.title} · {fmt.date(s.startedAt)}
              </TrainingLink>
              <p className="training-muted">
                {t("setsCompleted", {
                  count: fmt.number(s.logs.filter((l) => l.done).length),
                })}
              </p>
              {s.feedback && <p>{s.feedback}</p>}
            </div>
          ))
        ) : (
          <TrainingEmpty>{t("noWorkouts")}</TrainingEmpty>
        )}
      </TrainingCard>
    </>
  );
}
