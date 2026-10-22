"use client";
import { NativeSelect } from "@repo/ui/kit/NativeSelect";
import { useEffect, useRef, useState } from "react";
import { Send, ImagePlus, MessageCircle } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { useApiForeground } from "@repo/api/provider";
import {
  useTrainingQuery,
  type Collaboration,
  type TrainingMessage,
  type TrainingMessagePage,
  type WeeklyCheckin,
  type Exercise,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { Loading, QueryError } from "../account/common";
import {
  useTrainingParams,
  TrainingCard,
  TrainingGate,
  TrainingFeedback,
  TrainingEmpty,
  TrainingLink,
  useTrainingAction,
  useTrainingOwner,
  useTrainingLocale,
  trainingToday,
  useTrainingOnline,
} from "./common";
export function TrainingCollaboration() {
  const t = useTranslations("Training");
  return (
    <TrainingGate title={t("collaboration")}>
      <CollaborationContent />
    </TrainingGate>
  );
}
function PrivateImage({ id }: { id: string }) {
  const t = useTranslations("Training"),
    [show, setShow] = useState(false),
    q = useTrainingQuery<{ data: string }>(
      `profile/coaching-collaboration/images/${id}/content`,
      {},
      show,
    );
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setShow(!show)}>
        {t(show ? "hideImage" : "viewImage")}
      </Button>
      {show &&
        (q.data ? (
          <img
            className="training-preview"
            src={q.data.data}
            alt={t("privateImage")}
          />
        ) : q.error ? (
          <QueryError error={q.error} retry={q.refetch} />
        ) : (
          <Loading />
        ))}
    </>
  );
}
function CollaborationContent() {
  const id = useTrainingParams().get("id") ?? "",
    owner = useTrainingOwner(),
    t = useTranslations("Training"),
    fmt = useTrainingLocale(),
    a = useTrainingAction(),
    foreground = useApiForeground(),
    online = useTrainingOnline();
  const library = useTrainingQuery<Exercise[]>(
    "profile/training/exercises",
    {},
    online,
  );
  const base = `profile/coaching-collaboration/${id}`,
    q = useTrainingQuery<Collaboration>(base, {}, !!id && online),
    [before, setBefore] = useState<string | undefined>(),
    messages = useTrainingQuery<TrainingMessagePage>(
      `${base}/messages`,
      { before },
      !!id && online,
    );
  const [history, setHistory] = useState<TrainingMessage[]>([]),
    [body, setBody] = useState(""),
    [image, setImage] = useState<File | null>(null),
    [tab, setTab] = useState("messages"),
    [workoutId, setWorkoutId] = useState(""),
    [weekly, setWeekly] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null),
    file = useRef<HTMLInputElement>(null),
    read = useRef("");
  const attempt = useRef<{ fingerprint: string; operationId: string } | null>(
    null,
  );
  useEffect(() => {
    if (!online || !foreground || before) return;
    const timer = setInterval(() => {
      void messages.refetch();
      void q.refetch();
    }, 15000);
    return () => clearInterval(timer);
  }, [online, foreground, before, messages.refetch]);
  useEffect(() => {
    const latest = messages.data?.items[0]?.id;
    if (!foreground || !latest || before || read.current === latest) return;
    read.current = latest;
    void a.mutation
      .mutateAsync({ path: `${base}/read` })
      .catch(() => undefined);
  }, [messages.data, foreground, before, base]);
  if (!id) return <TrainingEmpty>{t("chooseRelationship")}</TrainingEmpty>;
  if (q.isPending) return <Loading />;
  if (q.error) return <QueryError error={q.error} retry={q.refetch} />;
  const d = q.data!,
    student = d.relationship.studentId === owner,
    active = d.relationship.status === "active";
  const combined = [
    ...new Map(
      [...history, ...(messages.data?.items ?? [])].map((m) => [m.id, m]),
    ).values(),
  ].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  return (
    <>
      <nav className="training-tabs" aria-label={t("collaboration")}>
        <Button
          type="button"
          variant={tab === "messages" ? "secondary" : "ghost"}
          aria-pressed={tab === "messages"}
          onClick={() => setTab("messages")}
        >
          {t("messages")}
        </Button>
        <Button
          type="button"
          variant={tab === "followup" ? "secondary" : "ghost"}
          aria-pressed={tab === "followup"}
          onClick={() => setTab("followup")}
        >
          {t("followup")}
        </Button>
      </nav>
      <TrainingFeedback action={a} />
      {!active && (
        <p role="status" className="training-notice">
          {t("relationshipEnded")}
        </p>
      )}
      {tab === "messages" && (
        <>
          {messages.data?.hasMore && (
            <Button
              type="button"
              variant="outline"
              disabled={messages.isFetching}
              onClick={() => {
                setHistory(combined);
                setBefore(messages.data!.items.at(-1)!.id);
              }}
            >
              {t("olderMessages")}
            </Button>
          )}
          {messages.error && (
            <QueryError error={messages.error} retry={messages.refetch} />
          )}
          <div
            className="training-root"
            role="log"
            aria-live="polite"
            aria-label={t("messages")}
          >
            {combined.length ? (
              combined.map((m) => (
                <article
                  className="training-bubble"
                  key={m.id}
                  data-own={m.senderId === owner}
                >
                  <p>{m.body}</p>
                  {m.workoutId && (
                    <TrainingLink
                      href={
                        student
                          ? `/training/workout?id=${m.workoutId}`
                          : `/training/conversation?id=${id}`
                      }
                    >
                      {t("relatedWorkout")}
                    </TrainingLink>
                  )}
                  {m.hasImage && <PrivateImage id={m.id} />}
                  <small>
                    {fmt.date(m.createdAt)} ·{" "}
                    {t(
                      m.senderId === owner
                        ? messages.data?.peerReadAt &&
                          m.createdAt <= messages.data.peerReadAt
                          ? "read"
                          : "sent"
                        : "received",
                    )}
                  </small>
                </article>
              ))
            ) : (
              <TrainingEmpty>
                <MessageCircle className="mx-auto mb-3" />
                {t("noMessages")}
              </TrainingEmpty>
            )}
          </div>
          {active && (
            <TrainingCard>
              <form
                className="training-root"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!body.trim() && !image) return;
                  void a.run(async () => {
                    const fingerprint = JSON.stringify([
                      body,
                      workoutId,
                      image?.name,
                      image?.size,
                      image?.lastModified,
                    ]);
                    if (attempt.current?.fingerprint !== fingerprint)
                      attempt.current = {
                        fingerprint,
                        operationId: crypto.randomUUID(),
                      };
                    const payload = {
                      body: body.trim() || t("imageMessage"),
                      workoutId: workoutId || null,
                      operationId: attempt.current.operationId,
                    };
                    if (image) {
                      const fd = new FormData();
                      fd.set("file", image);
                      fd.set("body", payload.body);
                      if (payload.workoutId)
                        fd.set("workoutId", payload.workoutId);
                      else fd.set("workoutId", "");
                      fd.set("operationId", payload.operationId);
                      await a.mutation.mutateAsync({
                        path: `${base}/images`,
                        body: fd,
                      });
                    } else
                      await a.mutation.mutateAsync({
                        path: `${base}/messages`,
                        body: payload,
                      });
                    setHistory([]);
                    setBefore(undefined);
                    setBody("");
                    setImage(null);
                    attempt.current = null;
                    if (file.current) file.current.value = "";
                    composer.current?.focus();
                  }, false);
                }}
              >
                <label>
                  {t("messageLabel")}
                  <textarea
                    ref={composer}
                    value={body}
                    maxLength={2000}
                    placeholder={t("messagePlaceholder")}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={a.pending}
                    rows={3}
                  />
                </label>
                <details>
                  <summary>{t("attachOrReference")}</summary>
                  <div className="training-root">
                    <label>
                      {t("relatedWorkout")}
                      <NativeSelect
                        value={workoutId}
                        onChange={(e) => setWorkoutId(e.target.value)}
                      >
                        <option value="">{t("none")}</option>
                        {d.sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.snapshot.title} · {fmt.date(s.startedAt)}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    <label>
                      <span className="training-actions">
                        <ImagePlus size={17} />
                        {t("attachImage")}
                      </span>
                      <input
                        ref={file}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={a.pending}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.size > 3 * 1024 * 1024) {
                            a.setError(new Error("Training.imageLimit"));
                            e.target.value = "";
                            return;
                          }
                          setImage(f ?? null);
                        }}
                      />
                    </label>
                    <p className="training-muted">{t("imageHint")}</p>
                    {image && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setImage(null);
                          if (file.current) file.current.value = "";
                        }}
                      >
                        {t("removeImage")} · {image.name}
                      </Button>
                    )}
                  </div>
                </details>
                <Button
                  type="submit"
                  disabled={a.pending || !online || (!body.trim() && !image)}
                >
                  <Send size={17} />
                  {t(a.pending ? "sending" : "send")}
                </Button>
              </form>
            </TrainingCard>
          )}
        </>
      )}
      {tab === "followup" && (
        <>
          {student && active && (
            <TrainingCard title={t("weeklyCheckin")}>
              <p className="training-muted">{t("weeklyHint")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWeekly(!weekly)}
              >
                {t("fillCheckin")}
              </Button>
              {weekly && (
                <CheckinForm
                  id={id}
                  checkin={d.checkins.find((c) => {
                    const today = new Date(trainingToday() + "T12:00:00Z");
                    today.setUTCDate(
                      today.getUTCDate() - ((today.getUTCDay() + 1) % 7),
                    );
                    return (
                      c.weekStart.slice(0, 10) ===
                      today.toISOString().slice(0, 10)
                    );
                  })}
                />
              )}
            </TrainingCard>
          )}
          {d.checkins.map((c) => (
            <TrainingCard key={c.id} title={fmt.date(c.weekStart)}>
              <p>
                {t("checkinSummary", {
                  days: fmt.number(c.adherence),
                  difficulty: fmt.number(c.difficulty),
                })}
              </p>
              <p>{c.body}</p>
              {c.feedback && <p className="training-notice">{c.feedback}</p>}
              {!student && active && (
                <FeedbackForm
                  relationship={id}
                  target="checkin"
                  id={c.id}
                  revision={c.revision}
                />
              )}
            </TrainingCard>
          ))}
          {!student && active && (
            <TrainingLink href={`/training/plan?relationship=${id}`}>
              {t("assignPlan")}
            </TrainingLink>
          )}
          <TrainingCard title={t("sharedWorkouts")}>
            {d.sessions.length ? (
              d.sessions.map((s) => (
                <div className="training-root" key={s.id}>
                  <h3>
                    {s.snapshot.title} · {fmt.date(s.startedAt)}
                  </h3>
                  <p className="training-muted">
                    {t("setsCompleted", {
                      count: fmt.number(s.logs.filter((l) => l.done).length),
                    })}
                  </p>
                  <details>
                    <summary>{t("showValues")}</summary>
                    {s.logs
                      .filter((l) => l.done)
                      .map((l) => (
                        <p key={`${l.prescriptionId}:${l.set}`}>
                          {fmt.locale === "fa"
                            ? library.data?.find((e) => e.id === l.exerciseId)
                                ?.nameFa
                            : library.data?.find((e) => e.id === l.exerciseId)
                                ?.nameEn}{" "}
                          · {t("set")} {fmt.number(l.set)} ·{" "}
                          {l.reps ?? l.seconds} · {l.load ?? "—"} {t("kg")}
                        </p>
                      ))}
                  </details>
                  {s.feedback && (
                    <p className="training-notice">{s.feedback}</p>
                  )}
                  {!student && active && s.state === "completed" && (
                    <FeedbackForm
                      relationship={id}
                      target="session"
                      id={s.id}
                      revision={s.revision}
                    />
                  )}
                </div>
              ))
            ) : (
              <TrainingEmpty>{t("noSharedWorkouts")}</TrainingEmpty>
            )}
          </TrainingCard>
          {d.plans.length > 0 && (
            <TrainingCard title={t("sharedPlans")}>
              {d.plans.map((p) => (
                <details key={p.id}>
                  <summary>
                    {p.title} · {t("version")} {p.version}
                  </summary>
                  {p.reviewDueAt && (
                    <p className="training-muted">
                      {t("nextPlanReview")} · {fmt.date(p.reviewDueAt)}
                    </p>
                  )}
                  {p.canReview && (
                    <div className="training-actions">
                      <TrainingLink href={`/training/plan?id=${p.id}`}>
                        {t("editPlan")}
                      </TrainingLink>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={a.pending}
                        onClick={() =>
                          void a.run(() =>
                            a.mutation.mutateAsync({
                              path: `profile/training/plans/${p.id}/review`,
                              body: {
                                revision: p.revision,
                                operationId: crypto.randomUUID(),
                              },
                            }),
                          )
                        }
                      >
                        {t("markPlanReviewed")}
                      </Button>
                    </div>
                  )}
                  {p.content.days.map((day, i) => (
                    <p key={i}>
                      {day.name} · {day.exercises.length} {t("movements")}
                    </p>
                  ))}
                </details>
              ))}
            </TrainingCard>
          )}
          {!!d.measurements.length && (
            <TrainingCard title={t("measurements")}>
              {d.measurements.map((m) => (
                <p key={m.id}>
                  {t(m.kind)} · {fmt.number(Number(m.value))} {t(m.unit)} ·{" "}
                  {fmt.date(m.measuredOn)}
                </p>
              ))}
            </TrainingCard>
          )}
          {student && active && (
            <TrainingCard title={t("sharing")}>
              <p className="training-muted">{t("sharingHint")}</p>
              {(["personalPlans", "measurements"] as const).map((k) => (
                <label className="training-check" key={k}>
                  <input
                    type="checkbox"
                    disabled={a.pending}
                    checked={d.sharing[k]}
                    onChange={(e) =>
                      void a.run(
                        () =>
                          a.mutation.mutateAsync({
                            path: `${base}/sharing`,
                            body: { ...d.sharing, [k]: e.target.checked },
                          }),
                        false,
                      )
                    }
                  />
                  {t(
                    k === "personalPlans"
                      ? "sharePersonalPlans"
                      : "shareMeasurements",
                  )}
                </label>
              ))}
            </TrainingCard>
          )}
        </>
      )}
    </>
  );
}
function CheckinForm({ id, checkin }: { id: string; checkin?: WeeklyCheckin }) {
  const t = useTranslations("Training"),
    a = useTrainingAction();
  return (
    <form
      className="training-root"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void a.run(() =>
          a.mutation.mutateAsync({
            path: `profile/coaching-collaboration/${id}/checkins`,
            body: {
              weekStart: trainingToday(),
              adherence: Number(f.get("adherence")),
              difficulty: Number(f.get("difficulty")),
              body: String(f.get("body")),
              revision: checkin?.revision ?? 0,
              operationId: crypto.randomUUID(),
            },
          }),
        );
      }}
    >
      <TrainingFeedback action={a} />
      <label>
        {t("adherence")}
        <input
          name="adherence"
          type="number"
          min={0}
          max={7}
          required
          defaultValue={checkin?.adherence ?? 0}
        />
      </label>
      <label>
        {t("difficulty")}
        <input
          name="difficulty"
          type="number"
          min={1}
          max={10}
          required
          defaultValue={checkin?.difficulty ?? 5}
        />
      </label>
      <label>
        {t("weeklyNote")}
        <textarea
          name="body"
          maxLength={2000}
          defaultValue={checkin?.body ?? ""}
        />
      </label>
      <Button type="submit" disabled={a.pending}>
        {t("submitCheckin")}
      </Button>
    </form>
  );
}
function FeedbackForm({
  relationship,
  target,
  id,
  revision,
}: {
  relationship: string;
  target: "session" | "checkin";
  id: string;
  revision: number;
}) {
  const t = useTranslations("Training"),
    a = useTrainingAction(),
    [body, setBody] = useState("");
  return (
    <form
      className="training-root"
      onSubmit={(e) => {
        e.preventDefault();
        void a.run(async () => {
          await a.mutation.mutateAsync({
            path: `profile/coaching-collaboration/${relationship}/${target}/${id}/feedback`,
            body: { body, revision, operationId: crypto.randomUUID() },
          });
          setBody("");
        });
      }}
    >
      <TrainingFeedback action={a} />
      <label>
        {t("coachFeedback")}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={1}
          maxLength={2000}
          required
        />
      </label>
      <Button type="submit" disabled={a.pending || !body.trim()}>
        {t("sendFeedback")}
      </Button>
    </form>
  );
}
