"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useProductNavigation } from "@repo/api/profile";
import { useTranslations, useLocale } from "@repo/i18n";
import { useSportsQuery, useSportsCommand } from "@repo/api/sports";
import { CommandError, Field, LumaPage, QueryState, stamp } from "./common";
type Program = {
  id: string;
  title: string;
  displayName: string;
  status:
    | "intake"
    | "queued"
    | "preparing"
    | "delivered"
    | "revision_requested"
    | "cancelled";
  revision: number;
  relationshipId: string;
  dueAt: string;
  supportEndsAt: string | null;
  assignmentId: string | null;
  intake: Record<string, string>;
  assignments: { id: string; title: string }[];
};
export function ProgramsPage() {
  const t = useTranslations("Workflow"),
    [coachMode, setCoach] = useState(false);
  const navigation = useProductNavigation();
  const canCoach = !navigation.error && navigation.data?.canCoach;
  const coach = coachMode && Boolean(canCoach);
  const history = useSportsQuery<{ id: string; title: string }[]>(
    "profile/program-history",
  );
  const simple = useTranslations("SimpleApp");
  const query = useSportsQuery<Program[]>(
    `profile/sports-workflows/${coach ? "coach/" : ""}programs`,
  );
  return (
    <LumaPage title={simple("programHistory")} back="/orders">
      {canCoach && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            className="luma-cta"
            aria-pressed={!coach}
            onClick={() => setCoach(false)}
          >
            {t("programs")}
          </button>
          <button
            className="luma-cta"
            aria-pressed={coach}
            onClick={() => setCoach(true)}
          >
            {t("coachPrograms")}
          </button>
        </div>
      )}
      {!coach && (
        <QueryState query={history}>
          {history.data?.map((p) => (
            <Link
              key={p.id}
              className="luma-row"
              href={`/programs/detail?id=${p.id}`}
            >
              {p.title}
            </Link>
          ))}
        </QueryState>
      )}
      <QueryState query={query}>
        {query.data?.map((p) => (
          <ProgramOrder
            key={`${coach}:${p.id}:${p.revision}`}
            program={p}
            coach={coach}
          />
        ))}
        {query.data?.length === 0 && <p>{t("empty")}</p>}
      </QueryState>
    </LumaPage>
  );
}
function ProgramOrder({
  program: p,
  coach,
}: {
  program: Program;
  coach: boolean;
}) {
  const [clock] = useState(() => Date.now());
  const t = useTranslations("Workflow"),
    locale = useLocale(),
    key = useRef(crypto.randomUUID());
  const intake = useSportsCommand(
      `profile/sports-workflows/programs/${p.id}/intake`,
    ),
    update = useSportsCommand(
      `profile/sports-workflows/coach/programs/${p.id}`,
    ),
    revision = useSportsCommand(
      `profile/sports-workflows/programs/${p.id}/revision`,
    );
  return (
    <article className="luma-group my-4 p-4 grid gap-4">
      <h2>
        {p.title} · {p.displayName}
      </h2>
      <p>{t(p.status)}</p>
      <p className="luma-meta">
        {t("dueAt")}: {stamp(p.dueAt, locale)}
      </p>
      {p.supportEndsAt && (
        <p className="luma-meta">
          {t("supportUntil")}: {stamp(p.supportEndsAt, locale)}
        </p>
      )}
      {coach &&
        Object.entries(p.intake).map(([name, value]) => (
          <p key={name} className="whitespace-pre-wrap">
            {value}
          </p>
        ))}
      {!coach && p.status === "intake" && (
        <form
          className="grid gap-3"
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            intake.mutate({
              revision: p.revision,
              goals: f.get("goals"),
              experience: f.get("experience"),
              limitations: f.get("limitations"),
              location: f.get("location"),
              idempotencyKey: key.current,
            });
          }}
        >
          {(["goals", "experience", "limitations", "location"] as const).map(
            (name) => (
              <Field key={name} label={t(name)}>
                <textarea
                  name={name}
                  minLength={name === "goals" ? 3 : 0}
                  maxLength={name === "location" ? 500 : 2000}
                  required={name === "goals"}
                />
              </Field>
            ),
          )}
          <button className="luma-cta" disabled={intake.isPending}>
            {t("sendIntake")}
          </button>
        </form>
      )}
      {coach &&
        ["queued", "preparing", "revision_requested"].includes(p.status) && (
          <>
            <button
              className="luma-cta"
              disabled={update.isPending || p.status === "preparing"}
              onClick={() =>
                update.mutate({
                  revision: p.revision,
                  status: "preparing",
                  idempotencyKey: key.current,
                })
              }
            >
              {t("startPreparing")}
            </button>
            <form
              className="grid gap-3"
              onChange={() => {
                key.current = crypto.randomUUID();
              }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                update.mutate({
                  revision: p.revision,
                  status: "delivered",
                  assignmentId: f.get("assignment"),
                  idempotencyKey: key.current,
                });
              }}
            >
              <Field label={t("assignmentId")}>
                <select name="assignment" required>
                  <option value="">{t("assignmentId")}</option>
                  {p.assignments?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="luma-cta" disabled={update.isPending}>
                {t("deliver")}
              </button>
            </form>
          </>
        )}
      {p.assignmentId && (
        <Link
          className="luma-row"
          href={`/programs/detail?id=${p.assignmentId}`}
        >
          {t("openTraining")}
        </Link>
      )}
      {!coach &&
        p.status === "delivered" &&
        p.supportEndsAt &&
        Date.parse(p.supportEndsAt) > clock && (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              revision.mutate({
                revision: p.revision,
                reason: f.get("reason"),
                idempotencyKey: key.current,
              });
            }}
          >
            <Field label={t("reason")}>
              <textarea name="reason" minLength={3} maxLength={2000} required />
            </Field>
            <button className="luma-cta" disabled={revision.isPending}>
              {t("requestRevision")}
            </button>
          </form>
        )}
      <CommandError error={intake.error ?? update.error ?? revision.error} />
    </article>
  );
}
