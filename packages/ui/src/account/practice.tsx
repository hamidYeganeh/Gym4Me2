"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  usePracticeQuery,
  type PracticeWorkspaceDto,
  type AssessmentDto,
  type NoteDto,
  type FinanceDto,
  type PracticeSessionDto,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { AccountDesignPage } from "./account-design";
import { CoachingSessions, StudentSessionJourney } from "./practice-sessions";
import { AnalyticsPanel } from "../analytics/panel";
import { Loading, QueryError } from "./common";
import {
  usePracticeAction,
  PracticeFeedback,
  PracticeField as Field,
  PracticeCheck as Check,
  PracticeForm as Form,
  text,
  checked,
  iso,
  list,
  PracticeMoney,
  PracticeDate,
} from "./practice-forms";
export function CredentialPreview({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const t = useTranslations("Practice");
  const [show, setShow] = useState(false);
  const q = usePracticeQuery<{ url: string }>(
    `${admin ? "admin/coaching" : "profile/coaching-practice"}/credentials/${id}/preview`,
    {},
    show,
  );
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setShow(true)}>
        {t("preview")}
      </Button>
      {q.isLoading && show && <Loading />}
      {q.error && <QueryError error={q.error} retry={q.refetch} />}{" "}
      {q.data && show && (
        <a href={q.data.url} target="_blank" rel="noreferrer">
          {t("openPrivateFile")}
        </a>
      )}
    </>
  );
}
export function CoachingPracticePanel() {
  const t = useTranslations("Practice"),
    locale = useLocale();
  const q = usePracticeQuery<PracticeWorkspaceDto>(
    "profile/coaching-practice",
    { view: "summary" },
  );
  const a = usePracticeAction();
  const [tab, setTab] = useState("sessions");
  if (q.isLoading) return <Loading />;
  if (q.error) return <QueryError error={q.error} retry={q.refetch} />;
  if (!q.data) return null;
  const d = q.data,
    p = d.practice;
  const date = (v: string) =>
    new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(v));
  return (
    <section className="space-y-5">
      <nav aria-label={t("workspace")} className="practice-navigation">
        {(
          ["sessions", "calendar", "profile", "finance", "analytics"] as const
        ).map((x) => (
          <Button
            key={x}
            variant={tab === x ? "secondary" : "outline"}
            type="button"
            aria-pressed={tab === x}
            onClick={() => setTab(x)}
          >
            {t(x)}
          </Button>
        ))}
        <Button variant="outline" asChild>
          <Link href="/training">{t("trainingWorkspace")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/coaches">{t("directory")}</Link>
        </Button>
      </nav>
      {(a.saved || Boolean(a.error)) && <PracticeFeedback action={a} />}
      {tab === "analytics" && <AnalyticsPanel surface="coach" />}
      {tab === "profile" && (
        <>
          <Form
            key={p?.revision ?? 0}
            title={t("professionalProfile")}
            pending={a.pending}
            onSubmit={(f) =>
              void a.run("profile/coaching-practice", {
                specialties: list(f, "specialties"),
                goals: list(f, "goals"),
                city: text(f, "city"),
                experienceYears: Number(text(f, "experienceYears")),
                bufferMinutes: Number(text(f, "bufferMinutes")),
                travelMinutes: Number(text(f, "travelMinutes")),
                published: checked(f, "published"),
                revision: p?.revision ?? 1,
              })
            }
          >
            <Field
              name="specialties"
              label={t("specialties")}
              value={p?.specialties.join("، ")}
            />
            <Field
              name="goals"
              label={t("goals")}
              value={p?.goals.join("، ")}
            />
            <Field name="city" label={t("city")} value={p?.city} />
            <Field
              name="experienceYears"
              type="number"
              label={t("experienceYears")}
              value={p?.experienceYears ?? 0}
            />
            <Field
              name="bufferMinutes"
              type="number"
              label={t("bufferMinutes")}
              value={p?.bufferMinutes ?? 0}
            />
            <Field
              name="travelMinutes"
              type="number"
              label={t("travelMinutes")}
              value={p?.travelMinutes ?? 0}
            />
            <Check
              name="published"
              label={t("publishConsent")}
              checked={p?.published}
            />
            <p>
              {t("reviewStatus")}: {t(p?.reviewStatus ?? "draft")}
            </p>
            {p?.reviewReason && <p>{p.reviewReason}</p>}
          </Form>
          {p && (
            <Form
              title={t("credential")}
              pending={a.pending}
              onSubmit={(f) => {
                const file = f.get("file");
                if (file instanceof File && file.size) {
                  const body = new FormData();
                  for (const key of ["title", "issuer"])
                    body.set(key, text(f, key));
                  body.set("expiresAt", iso(f, "expiresAt"));
                  body.set("file", file);
                  void a.run(
                    "profile/coaching-practice/credentials/upload",
                    body,
                  );
                } else
                  void a.run("profile/coaching-practice/credentials", {
                    title: text(f, "title"),
                    issuer: text(f, "issuer"),
                    expiresAt: iso(f, "expiresAt"),
                  });
              }}
            >
              <Field name="title" label={t("credentialTitle")} required />
              <Field name="issuer" label={t("issuer")} required />
              <Field
                name="expiresAt"
                type="datetime-local"
                label={t("expiresAt")}
                required
              />
              <label className="grid gap-2">
                {t("credentialFile")}
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                />
              </label>
              <p className="text-sm text-muted-foreground">{t("fileLimit")}</p>
            </Form>
          )}
          {d.credentials.map((c) => (
            <article key={c.id} className="rounded-3xl border p-4">
              <p>
                {c.title} · {c.issuer}
              </p>
              <p>{date(c.expiresAt)}</p>
              {c.hasFile && <CredentialPreview id={c.id} />}
            </article>
          ))}
        </>
      )}
      {tab === "calendar" && (
        <>
          <p>{t("calendarHint")}</p>
          <Form
            title={t("availability")}
            pending={a.pending}
            onSubmit={(f) =>
              void a.run("profile/coaching-practice/availability", {
                kind: text(f, "kind"),
                startsAt: iso(f, "startsAt"),
                endsAt: iso(f, "endsAt"),
              })
            }
          >
            <Field name="kind" label={t("kind")}>
              <NativeSelect name="kind">
                <NativeSelectOption value="available">
                  {t("available")}
                </NativeSelectOption>
                <NativeSelectOption value="blocked">
                  {t("blocked")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field
              name="startsAt"
              label={t("startsAt")}
              type="datetime-local"
              required
            />
            <Field
              name="endsAt"
              label={t("endsAt")}
              type="datetime-local"
              required
            />
          </Form>
          {d.availability.map((v) => (
            <article key={v.id} className="rounded-3xl border p-4">
              <p>
                {t(v.kind === "blocked" ? "blocked" : "available")} ·{" "}
                {date(v.startsAt)} — {date(v.endsAt)}
              </p>
              <Button
                variant="outline"
                disabled={a.pending}
                onClick={() =>
                  void a.run(
                    `profile/coaching-practice/availability/${v.id}/remove`,
                    {},
                  )
                }
              >
                {t("remove")}
              </Button>
            </article>
          ))}
        </>
      )}
      {tab === "sessions" && <CoachingSessions workspace={d} />}
      <Link href="/programs" className="underline">
        {t("programOrders")}
      </Link>
      {tab === "finance" && <CoachFinance />}
      <StudentSessionJourney
        sessions={d.studentSessions}
        memberships={d.studentMemberships}
        renderActions={(s) =>
          ["completed", "no_show"].includes(s.status ?? "") && (
            <>
              <Button asChild variant="outline">
                <Link href={`/coaching/session?id=${s.id}`}>
                  {t("sessionNote")}
                </Link>
              </Button>
              <StudentReview session={s} />
            </>
          )
        }
      />
    </section>
  );
}
function CoachFinance() {
  const ph5 = useTranslations("PH5");
  const t = useTranslations("Practice");
  const q = usePracticeQuery<FinanceDto>("profile/coaching-practice/finance");
  if (q.isLoading) return <Loading />;
  if (q.error) return <QueryError error={q.error} retry={q.refetch} />;
  return (
    <div className="space-y-4">
      <Button asChild variant="outline">
        <Link href="/coaching/settlements">{ph5("title")}</Link>
      </Button>
      <p>{t("financeHint")}</p>
      {!q.data?.contracts.length && !q.data?.ledger.length && (
        <p>{t("noFinance")}</p>
      )}
      {q.data?.contracts.map((c) => (
        <article key={c.id} className="rounded-3xl border p-5">
          <h3>
            {c.clubName} · {c.branchName} · {t("version")} {c.version}
          </h3>
          <p>
            <PracticeDate value={c.startsOn} /> —{" "}
            {c.endsOn ? <PracticeDate value={c.endsOn} /> : "…"}
          </p>
          <p>
            {c.shareBasisPoints / 100}% ·{" "}
            {t(c.basis === "net" ? "net" : "gross")}
          </p>
          <p>{c.terms}</p>
        </article>
      ))}
      {q.data?.ledger.map((l) => (
        <article key={l.id} className="rounded-3xl border p-4">
          <p>
            {t(
              l.kind === "payment"
                ? "payment"
                : l.kind === "income"
                  ? "income"
                  : "adjustment",
            )}{" "}
            · <PracticeMoney value={l.amountMinor} />
          </p>
          <p>
            {t(l.confirmed ? "confirmedAmount" : "estimated")} · {l.reference}
          </p>
        </article>
      ))}
    </div>
  );
}
export function StudentAssessment() {
  const params = useSearchParams(),
    id = params.get("id") ?? "";
  const t = useTranslations("Practice");
  const q = usePracticeQuery<AssessmentDto | null>(
    `profile/coaching-practice/relationships/${id}/assessment`,
    {},
    Boolean(id),
  );
  const a = usePracticeAction();
  return (
    <AccountDesignPage title={t("assessment")} backHref="/coaching">
      <PracticeFeedback action={a} />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : (
        <Form
          key={q.data?.revision ?? 0}
          title={t("assessment")}
          pending={a.pending || !q.data?.canEdit}
          onSubmit={(f) =>
            void a.run(
              `profile/coaching-practice/relationships/${id}/assessment`,
              {
                goals: text(f, "goals"),
                level: text(f, "level"),
                equipment: text(f, "equipment"),
                limitations: text(f, "limitations"),
                shared: checked(f, "shared"),
                revision: q.data?.revision ?? 0,
              },
            )
          }
        >
          {(["goals", "level", "equipment", "limitations"] as const).map(
            (key) => (
              <Field
                key={key}
                name={key}
                label={t(key)}
                type="textarea"
                value={(q.data?.[key as keyof AssessmentDto] as string) ?? ""}
              />
            ),
          )}
          <Check
            name="shared"
            label={t("assessmentConsent")}
            checked={q.data?.shared}
          />
          <p>{t("assessmentHint")}</p>
        </Form>
      )}
    </AccountDesignPage>
  );
}
export function CoachingSessionNote() {
  const params = useSearchParams(),
    id = params.get("id") ?? "";
  const t = useTranslations("Practice");
  const q = usePracticeQuery<NoteDto | null>(
    `profile/coaching-practice/sessions/${id}/note`,
    {},
    Boolean(id),
  );
  const a = usePracticeAction();
  return (
    <AccountDesignPage title={t("sessionNote")} backHref="/coaching">
      <PracticeFeedback action={a} />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : (
        <Form
          key={q.data?.revision ?? 0}
          title={t("sessionNote")}
          pending={a.pending || !q.data?.canEdit}
          onSubmit={(f) =>
            void a.run(`profile/coaching-practice/sessions/${id}/note`, {
              note: text(f, "note"),
              followUp: text(f, "followUp"),
              shared: checked(f, "shared"),
              revision: q.data?.revision ?? 0,
            })
          }
        >
          <Field
            name="note"
            label={t("note")}
            type="textarea"
            value={q.data?.note}
          />
          <Field
            name="followUp"
            label={t("followUp")}
            type="textarea"
            value={q.data?.followUp}
          />
          <Check
            name="shared"
            label={t("noteConsent")}
            checked={q.data?.shared}
          />
          <p>{t("noteHint")}</p>
        </Form>
      )}
    </AccountDesignPage>
  );
}
function StudentReview({ session }: { session: PracticeSessionDto }) {
  const t = useTranslations("Practice");
  const a = usePracticeAction();
  const q = usePracticeQuery<
    {
      reservationId: string;
      rating: number;
      body: string;
      published: boolean;
      example: string;
      exampleConsent: boolean;
      revision: number;
    }[]
  >("profile/coaching-practice/reviews");
  const old = q.data?.find((x) => x.reservationId === session.id);
  if (session.status !== "completed" && !old && !q.isLoading) return null;
  return (
    <details>
      <summary>{t("reviewSession")}</summary>
      <PracticeFeedback action={a} />
      {old && (
        <Button
          variant="outline"
          disabled={a.pending}
          onClick={() =>
            void a.run(
              `profile/coaching-practice/sessions/${session.id}/review`,
              {
                rating: old.rating,
                body: old.body,
                published: false,
                example: old.example,
                exampleConsent: false,
                revision: old.revision,
              },
            )
          }
        >
          {t("withdrawPublication")}
        </Button>
      )}
      {q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : q.isLoading ? (
        <Loading />
      ) : (
        <Form
          key={old?.revision ?? 0}
          title={t("reviewSession")}
          pending={a.pending}
          onSubmit={(f) =>
            void a.run(
              `profile/coaching-practice/sessions/${session.id}/review`,
              {
                rating: Number(text(f, "rating")),
                body: text(f, "body"),
                published: checked(f, "published"),
                example: text(f, "example"),
                exampleConsent: checked(f, "exampleConsent"),
                revision: old?.revision ?? 0,
              },
            )
          }
        >
          <Field name="rating" label={t("rating")}>
            <NativeSelect name="rating" defaultValue={old?.rating ?? 5}>
              {[1, 2, 3, 4, 5].map((v) => (
                <NativeSelectOption key={v} value={v}>
                  {v}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field
            name="body"
            label={t("reviewBody")}
            type="textarea"
            value={old?.body}
            required
          />
          <Check
            name="published"
            label={t("reviewConsent")}
            checked={old?.published}
          />
          <Field
            name="example"
            label={t("example")}
            type="textarea"
            value={old?.example}
          />
          <Check
            name="exampleConsent"
            label={t("exampleConsent")}
            checked={old?.exampleConsent}
          />
        </Form>
      )}
    </details>
  );
}
