"use client";

import {
  usePracticeQuery,
  type CoachingMembershipDto,
  type PracticeParticipantDto,
  type PracticeSessionDto,
  type PracticeWorkspaceDto,
} from "@repo/api/profile";
import { useSportsQuery } from "@repo/api/sports";
import { useLocale, useTranslations } from "@repo/i18n";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Calendar1Icon as CalendarDays,
  CheckIcon as Check,
  ChevronLeftIcon as ChevronLeft,
  ClockIcon as Clock3,
  MapPin1Icon as MapPin,
  PlusIcon as Plus,
  UsersTwoIcon as Users,
  CloseXIcon as X,
} from "../icons";
import { BottomSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Textarea } from "../kit/Textarea";
import {
  coachingSessionBalance,
  groupCoachingSessions,
  nextCoachingSession,
  type CoachingSessionGroup,
} from "../lib/coaching-sessions";
import { cn } from "../lib/utils";
import { MakeupSession } from "../sports/class-roster";
import {
  ManagementFilterBar,
  useManagementFilters,
} from "../sports/management-filters";
import { AccountAvatar } from "./account-design";
import { Pager } from "./admin";
import { Loading, QueryError } from "./common";
import {
  PracticeField as Field,
  PracticeForm as Form,
  iso,
  PracticeDate,
  PracticeFeedback,
  text,
  usePracticeAction,
} from "./practice-forms";
import { WorkoutTimer } from "../training/workout-timer";
import "./practice-sessions.css";

const statusKeys: Record<
  string,
  "pending" | "completed" | "absent" | "confirmed" | "cancelled" | "scheduled"
> = {
  pending_approval: "pending",
  completed: "completed",
  no_show: "absent",
  confirmed: "confirmed",
  cancelled: "cancelled",
  scheduled: "scheduled",
};

function SessionStatus({ status }: { status: string }) {
  const t = useTranslations("Practice");
  return (
    <span className="coaching-session-status" data-status={status}>
      {status === "completed" && (
        <Check className="size-3.5" aria-hidden="true" />
      )}
      {status === "cancelled" && <X className="size-3.5" aria-hidden="true" />}
      {t(statusKeys[status] ?? "scheduled")}
    </span>
  );
}

function SessionTimeline({
  sessions,
  onSelect,
  student = false,
  renderActions,
}: {
  sessions: PracticeSessionDto[];
  onSelect?: (group: CoachingSessionGroup) => void;
  student?: boolean;
  renderActions?: (session: PracticeSessionDto) => ReactNode;
}) {
  const t = useTranslations("Practice"),
    locale = useLocale();
  const groups = groupCoachingSessions(sessions);
  const next = nextCoachingSession(groups, Date.now());
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "Asia/Tehran",
  });
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "Asia/Tehran",
  });
  return (
    <ol className="coaching-session-timeline" aria-label={t("sessionJourney")}>
      {groups.map((group) => {
        const s = group.session,
          current = s.occurrenceId === next;
        const content = (
          <>
            <span className="coaching-session-row-top">
              <span className="font-semibold leading-7">{s.title}</span>
              <ChevronLeft
                className="size-4 shrink-0 text-muted-foreground ltr:rotate-180"
                aria-hidden="true"
              />
            </span>
            <span className="text-sm text-muted-foreground leading-6">
              {student
                ? (s.displayName ?? t("coach"))
                : group.reservations.length === 1
                  ? (group.reservations[0]?.displayName ?? t("unnamedStudent"))
                  : group.reservations.length
                    ? t("participantCount", {
                        count: group.reservations.length,
                      })
                    : t("noStudent")}
            </span>
            <span className="text-xs text-muted-foreground leading-6">
              <PracticeDate value={s.startAt} />
            </span>
            <span className="flex flex-wrap items-center gap-2 pt-1">
              <SessionStatus status={group.status} />
              {current && (
                <span className="text-xs font-medium text-primary">
                  {t("nextSession")}
                </span>
              )}
            </span>
          </>
        );
        return (
          <li
            key={s.occurrenceId}
            className="coaching-session-stop"
            data-current={current || undefined}
          >
            <div
              className="coaching-session-marker"
              aria-hidden="true"
              data-status={group.status}
            >
              {group.status === "completed" ? (
                <Check className="size-5" />
              ) : (
                <>
                  <span className="text-lg font-semibold tabular-nums">
                    {day.format(new Date(s.startAt))}
                  </span>
                  <span className="text-[10px] leading-4">
                    {month.format(new Date(s.startAt))}
                  </span>
                </>
              )}
            </div>
            <article className="coaching-session-row">
              {onSelect ? (
                <button
                  type="button"
                  className="coaching-session-row-link"
                  aria-haspopup="dialog"
                  onClick={() => onSelect(group)}
                >
                  {content}
                </button>
              ) : (
                <Link
                  className="coaching-session-row-link"
                  href={`/bookings/detail?id=${s.id}`}
                >
                  {content}
                </Link>
              )}
              {renderActions && (
                <div className="coaching-session-row-actions">
                  {renderActions(s)}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function CoachingSessions({
  workspace,
}: {
  workspace: PracticeWorkspaceDto;
}) {
  const t = useTranslations("Practice"),
    locale = useLocale();
  const filters = useManagementFilters("practice-sessions");
  const query = usePracticeQuery<PracticeSessionDto[]>(
    "profile/coaching-practice/sessions",
    filters.filters,
  );
  const [selected, setSelected] = useState<CoachingSessionGroup | null>(null);
  const current =
    selected &&
    groupCoachingSessions(query.data ?? []).find(
      (g) => g.session.occurrenceId === selected.session.occurrenceId,
    );
  const summary = workspace.sessionSummary;
  return (
    <section className="coaching-sessions space-y-6" aria-label={t("sessions")}>
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{t("workspace")}</p>
        <h2 className="text-2xl font-semibold">{t("yourSessions")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          {t("sessionJourneyHint")}
        </p>
      </header>
      {summary && (
        <div
          className="coaching-session-summary"
          aria-label={t("allSessionsSummary")}
        >
          {(["total", "completed", "upcoming"] as const).map((key) => (
            <div key={key}>
              <strong>
                {new Intl.NumberFormat(locale).format(summary[key])}
              </strong>
              <span>{t(`${key}Sessions`)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{t("sessionJourney")}</h3>
        <ManagementFilterBar
          value={filters.filters}
          onApply={filters.apply}
          statuses={[
            "scheduled",
            "pending_approval",
            "confirmed",
            "completed",
            "no_show",
            "cancelled",
          ]}
        />
      </div>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading && <Loading />}
      {query.isSuccess && !query.data?.length && (
        <div className="coaching-sessions-empty">
          <CalendarDays
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">{t("noSessions")}</p>
          <p className="text-sm text-muted-foreground">{t("noSessionsHint")}</p>
        </div>
      )}
      {Boolean(query.data?.length) && (
        <SessionTimeline sessions={query.data ?? []} onSelect={setSelected} />
      )}
      <Pager
        page={filters.filters.page}
        setPage={filters.page}
        count={groupCoachingSessions(query.data ?? []).length}
      />
      <ScheduleSession services={workspace.services} />
      {selected && (
        <CoachSessionDetail
          key={selected.session.occurrenceId}
          group={current ?? selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function ScheduleSession({
  services,
}: {
  services: PracticeWorkspaceDto["services"];
}) {
  const t = useTranslations("Practice"),
    a = usePracticeAction();
  const available = services.filter(
    (s) => s.kind !== "membership" && s.kind !== "program",
  );
  return (
    <details className="coaching-schedule rounded-2xl border border-border bg-card p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
        <Plus className="size-4" aria-hidden="true" />
        {t("schedule")}
      </summary>
      <div className="pt-4">
        <PracticeFeedback action={a} />
        {!available.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noSchedulableServices")}
          </p>
        ) : (
          <Form
            title={t("schedule")}
            pending={a.pending}
            onSubmit={(f) =>
              void a.run(
                `profile/coaching-practice/services/${text(f, "service")}/sessions`,
                {
                  startAt: iso(f, "startAt"),
                  endAt: iso(f, "endAt"),
                  capacity: Number(text(f, "capacity")),
                },
              )
            }
          >
            <Field name="service" label={t("service")}>
              <NativeSelect name="service" required>
                {available.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.title} · {s.clubName} · {s.branchName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field
              name="startAt"
              type="datetime-local"
              label={t("startsAt")}
              required
            />
            <Field
              name="endAt"
              type="datetime-local"
              label={t("endsAt")}
              required
            />
            <Field
              name="capacity"
              type="number"
              label={t("capacity")}
              value={1}
              min={1}
              required
            />
          </Form>
        )}
      </div>
    </details>
  );
}

function CoachSessionDetail({
  group,
  onClose,
}: {
  group: CoachingSessionGroup;
  onClose: () => void;
}) {
  const t = useTranslations("Practice"),
    locale = useLocale(),
    formId = useId();
  const s = group.session;
  const root = `profile/sports-workflows/coach/occurrences/${s.occurrenceId}`;
  const roster = useSportsQuery<PracticeParticipantDto[]>(`${root}/roster`);
  const a = usePracticeAction();
  const [changes, setChanges] = useState<
    Record<string, { present: boolean; revision: number }>
  >({});
  const key = useRef(crypto.randomUUID());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const next = [Date.parse(s.startAt), Date.parse(s.endAt)]
      .filter((time) => time > now)
      .sort((left, right) => left - right)[0];
    if (next === undefined) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(next - now + 100, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [s.startAt, s.endAt, now]);
  const cancelled = s.occurrenceStatus === "cancelled";
  const future = Date.parse(s.startAt) > now;
  const editable = (r: PracticeParticipantDto) =>
    !cancelled &&
    !future &&
    r.paymentStatus === "paid" &&
    ["confirmed", "completed", "no_show"].includes(r.status);
  const selected =
    roster.data?.filter((r) => editable(r) && Object.hasOwn(changes, r.id)) ??
    [];
  const format = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !a.pending) onClose();
      }}
      title={t("sessionDetails")}
      description={s.title}
      footer={
        <div className="coaching-session-footer">
          <PracticeFeedback action={a} />
          {future && !cancelled && (
            <p className="mb-3 text-center text-xs text-muted-foreground">
              {t("attendanceAfterStart")}
            </p>
          )}
          <Button
            form={formId}
            type="submit"
            className="h-12 w-full"
            disabled={
              !selected.length ||
              a.pending ||
              roster.isFetching ||
              cancelled ||
              future
            }
          >
            {a.pending ? t("savingAttendance") : t("recordSession")}
            {Boolean(selected.length) && (
              <span>
                ({new Intl.NumberFormat(locale).format(selected.length)})
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="coaching-session-detail space-y-6">
        {!["cancelled", "completed", "no_show"].includes(group.status) && <WorkoutTimer sessionKey={`coach:${s.occurrenceId}`} />}
        <div className="space-y-4">
          <SessionStatus status={group.status} />
          <h3 className="text-2xl font-semibold leading-9">{s.title}</h3>
          <dl className="coaching-session-facts">
            <div>
              <CalendarDays aria-hidden="true" />
              <dt>{t("sessionDate")}</dt>
              <dd>
                {format(s.startAt, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </dd>
            </div>
            <div>
              <Clock3 aria-hidden="true" />
              <dt>{t("sessionTime")}</dt>
              <dd>
                {format(s.startAt, { hour: "2-digit", minute: "2-digit" })} —{" "}
                {format(s.endAt, { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
            {(s.clubName || s.branchName) && (
              <div>
                <MapPin aria-hidden="true" />
                <dt>{t("sessionLocation")}</dt>
                <dd>
                  {[s.clubName, s.branchName].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <section
          className="space-y-4 border-t border-border pt-5"
          aria-label={t("participants")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-semibold">
              <Users className="size-4" aria-hidden="true" />
              {t("participants")}
              {roster.data && (
                <span className="text-sm text-muted-foreground">
                  ({new Intl.NumberFormat(locale).format(roster.data.length)})
                </span>
              )}
            </h4>
            {roster.data?.some(editable) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={a.pending}
                onClick={() => {
                  key.current = crypto.randomUUID();
                  setChanges(
                    Object.fromEntries(
                      roster
                        .data!.filter(editable)
                        .map((r) => [
                          r.id,
                          { present: true, revision: r.revision },
                        ]),
                    ),
                  );
                }}
              >
                {t("allPresent")}
              </Button>
            )}
          </div>
          <QueryError error={roster.error} retry={roster.refetch} />
          {roster.isLoading && <Loading />}
          {roster.isSuccess && !roster.data?.length && (
            <p className="text-sm text-muted-foreground">{t("noStudent")}</p>
          )}
          {roster.data?.map((r) => (
            <article key={r.id} className="coaching-participant">
              <div className="flex min-w-0 items-center gap-3">
                <AccountAvatar name={r.displayName} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium break-words">
                    {r.displayName ?? t("unnamedStudent")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <SessionStatus status={r.status} />
                    {r.checkedInAt && (
                      <span className="text-xs text-muted-foreground">
                        {t("checkedInOnly")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {r.membershipId && (
                <MembershipBalance
                  granted={r.granted}
                  consumed={r.consumed ?? 0}
                  held={r.held}
                  compact
                />
              )}
              {editable(r) && (
                <label className="grid gap-2 text-sm">
                  {t("attendanceFor", {
                    name: r.displayName ?? t("unnamedStudent"),
                  })}
                  <NativeSelect
                    value={
                      Object.hasOwn(changes, r.id)
                        ? changes[r.id]?.present
                          ? "present"
                          : "absent"
                        : "unchanged"
                    }
                    disabled={a.pending}
                    onChange={(e) => {
                      key.current = crypto.randomUUID();
                      const value = e.target.value;
                      setChanges((old) => {
                        const next = { ...old };
                        if (value === "unchanged") delete next[r.id];
                        else
                          next[r.id] = {
                            present: value === "present",
                            revision: r.revision,
                          };
                        return next;
                      });
                    }}
                  >
                    <NativeSelectOption value="unchanged">
                      {t("keepAttendance")}
                    </NativeSelectOption>
                    <NativeSelectOption value="present">
                      {t("present")}
                    </NativeSelectOption>
                    <NativeSelectOption value="absent">
                      {t("absent")}
                    </NativeSelectOption>
                  </NativeSelect>
                </label>
              )}
              {r.paymentStatus !== "paid" && (
                <p className="text-xs text-muted-foreground">
                  {t("attendancePaymentRequired")}
                </p>
              )}
              {r.status === "pending_approval" && !cancelled && (
                <Form
                  title={t("decision")}
                  pending={a.pending}
                  onSubmit={(f) =>
                    void a.run(
                      `profile/coaching-practice/sessions/${r.id}/approval`,
                      {
                        revision: r.revision,
                        approve: text(f, "decision") === "approve",
                        reason: text(f, "reason"),
                      },
                    )
                  }
                >
                  <Field name="decision" label={t("decision")}>
                    <NativeSelect name="decision">
                      <NativeSelectOption value="approve">
                        {t("approve")}
                      </NativeSelectOption>
                      <NativeSelectOption value="reject">
                        {t("reject")}
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field name="reason" label={t("reason")} required />
                </Form>
              )}
              {["completed", "no_show"].includes(r.status) && (
                <Button asChild variant="outline">
                  <Link href={`/coaching/session?id=${r.id}`}>
                    {t("sessionNote")}
                    <ChevronLeft
                      className="ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              )}
              {r.status === "no_show" && !cancelled && (
                <MakeupSession
                  root="profile/sports-workflows/coach/"
                  occurrenceId={s.occurrenceId}
                  reservation={{
                    ...r,
                    displayName: r.displayName ?? t("unnamedStudent"),
                  }}
                />
              )}
            </article>
          ))}
        </section>
        {roster.data?.some((r) =>
          ["confirmed", "completed", "no_show"].includes(r.status),
        ) &&
          !cancelled && (
            <form
              id={formId}
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selected.length || a.pending) return;
                const reason = text(new FormData(e.currentTarget), "reason");
                if (
                  await a.run(`${root}/rollcall`, {
                    changes: selected.map((r) => ({
                      reservationId: r.id,
                      revision: changes[r.id]!.revision,
                      present: changes[r.id]!.present,
                    })),
                    reason,
                    idempotencyKey: key.current,
                  })
                ) {
                  setChanges({});
                  key.current = crypto.randomUUID();
                }
              }}
            >
              <label className="grid gap-2 text-sm">
                {t("attendanceReason")}
                <Textarea
                  name="reason"
                  required
                  minLength={3}
                  maxLength={500}
                  disabled={a.pending || future}
                  onChange={() => {
                    key.current = crypto.randomUUID();
                  }}
                  placeholder={t("attendanceReasonPlaceholder")}
                />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">
                {t("coachCompletionHint")}
              </p>
            </form>
          )}
        {s.occurrenceStatus === "scheduled" && Date.parse(s.endAt) > now && (
          <details className="coaching-session-secondary border-t border-border pt-4">
            <summary className="cursor-pointer py-2 text-sm text-muted-foreground">
              {t("cancelSession")}
            </summary>
            <Form
              title={t("cancelSession")}
              pending={a.pending}
              onSubmit={(f) =>
                void a.run(
                  `profile/coaching-practice/occurrences/${s.occurrenceId}/cancel`,
                  {
                    revision: s.occurrenceRevision,
                    reason: text(f, "reason"),
                  },
                )
              }
            >
              <Field name="reason" label={t("reason")} required />
              <p className="text-sm leading-7 text-muted-foreground">
                {t("cancelHint")}
              </p>
            </Form>
          </details>
        )}
      </div>
    </BottomSheet>
  );
}

function MembershipBalance({
  granted,
  consumed,
  held,
  compact = false,
}: {
  granted: number | null;
  consumed: number;
  held: number;
  compact?: boolean;
}) {
  const t = useTranslations("Practice"),
    locale = useLocale();
  const free = coachingSessionBalance(granted, consumed, held),
    n = new Intl.NumberFormat(locale);
  return (
    <div
      className={cn(
        "coaching-membership-balance",
        compact && "coaching-membership-balance-compact",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {free === null
            ? t("unlimitedSessions")
            : t("freeSessionCount", { count: free })}
        </p>
        {granted !== null && (
          <span className="text-xs text-muted-foreground">
            {t("packageTotal", { count: granted })}
          </span>
        )}
      </div>
      {granted !== null && granted > 0 && (
        <div
          className="coaching-membership-track"
          role="img"
          aria-label={t("packageProgress", { consumed, held, free: free ?? 0 })}
        >
          <span
            className="coaching-membership-used"
            style={{ width: `${Math.min(100, (consumed / granted) * 100)}%` }}
          />
          <span
            className="coaching-membership-held"
            style={{
              width: `${Math.min(100 - Math.min(100, (consumed / granted) * 100), (held / granted) * 100)}%`,
            }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t("usedSessions")}: {n.format(consumed)}
        </span>
        <span>
          {t("reservedSessions")}: {n.format(held)}
        </span>
      </div>
    </div>
  );
}

export function StudentSessionJourney({
  sessions,
  memberships = [],
  renderActions,
}: {
  sessions: PracticeSessionDto[];
  memberships?: CoachingMembershipDto[];
  renderActions: (session: PracticeSessionDto) => ReactNode;
}) {
  const t = useTranslations("Practice");
  if (!sessions.length && !memberships.length) return null;
  return (
    <section
      className="coaching-sessions space-y-5 border-t border-border pt-6"
      aria-label={t("myCoachingSessions")}
    >
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">{t("myCoachingSessions")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          {t("studentSessionHint")}
        </p>
      </header>
      {memberships.map((m) => (
        <article
          key={m.id}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{m.title}</h3>
            <Link
              className="text-sm text-primary underline-offset-4 hover:underline"
              href={`/memberships/detail?id=${m.id}`}
            >
              {t("packageDetails")}
            </Link>
          </div>
          <MembershipBalance
            granted={m.granted}
            consumed={m.consumed}
            held={m.held}
          />
          {m.endsAt && (
            <p className="text-xs text-muted-foreground">
              {t("packageExpiry")} <PracticeDate value={m.endsAt} />
            </p>
          )}
        </article>
      ))}
      <SessionTimeline
        sessions={sessions}
        student
        renderActions={renderActions}
      />
    </section>
  );
}
