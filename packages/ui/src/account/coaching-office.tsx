"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useTranslations } from "@repo/i18n";
import { useOrganizations, useBranches } from "@repo/api/business";
import {
  usePracticeQuery,
  type FinanceDto,
  type PracticeReviewDto,
  type CoachReviewReportDto,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Loading, QueryError } from "./common";
import { PrivacyNotice } from "./privacy";
import { CredentialPreview } from "./practice";
import {
  usePracticeAction,
  PracticeFeedback,
  PracticeField as Field,
  PracticeCheck as Check,
  PracticeForm as Form,
  text,
  checked,
  iso,
  PracticeMoney,
  PracticeDate,
  usePracticeDate,
} from "./practice-forms";
export function CoachingOffice({ surface }: { surface: "business" | "admin" }) {
  const t = useTranslations("Practice");
  return (
    <main className="mx-auto min-h-dvh max-w-5xl space-y-6 px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {t(surface === "admin" ? "coachReview" : "coachingManagement")}
        </h1>
        <Button asChild variant="outline">
          <Link href="/">{t("back")}</Link>
        </Button>
      </header>
      <PrivacyNotice />
      {surface === "admin" ? (
        <>
          <AdminCoaching />
          <ReviewReports />
        </>
      ) : (
        <BusinessCoaching />
      )}
    </main>
  );
}
function AdminCoaching() {
  const t = useTranslations("Practice");
  const q = usePracticeQuery<PracticeReviewDto[]>("admin/coaching");
  const a = usePracticeAction();
  return (
    <>
      <PracticeFeedback action={a} />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : !q.data?.length ? (
        <p>{t("emptyReviewQueue")}</p>
      ) : (
        q.data?.map((p) => (
          <article
            className="space-y-4 rounded-3xl border bg-card p-5"
            key={p.userId}
          >
            <h2 className="text-xl font-semibold">
              {p.displayName ?? t("coach")}
            </h2>
            <p>
              {p.city} · {p.specialties.join("، ")} · {t(p.reviewStatus)}
            </p>
            {p.credentials.map((c) => (
              <div key={c.id} className="space-y-2">
                <p>
                  {c.title} · {c.issuer} · <PracticeDate value={c.expiresAt} />
                </p>
                {c.hasFile && <CredentialPreview id={c.id} admin />}
              </div>
            ))}
            <Form
              key={p.revision}
              title={t("decision")}
              pending={a.pending}
              onSubmit={(f) =>
                void a.run(`admin/coaching/${p.userId}/review`, {
                  approved: checked(f, "approved"),
                  reason: text(f, "reason"),
                  expiresAt: iso(f, "expiresAt"),
                  revision: p.revision,
                })
              }
            >
              <Check
                name="approved"
                label={t("approve")}
                checked={p.reviewStatus === "approved"}
              />
              <Field
                name="expiresAt"
                type="datetime-local"
                label={t("reviewExpiresAt")}
                required
              />
              <Field name="reason" label={t("reason")} required />
            </Form>
          </article>
        ))
      )}
    </>
  );
}
function BusinessCoaching() {
  const date = usePracticeDate();
  const t = useTranslations("Practice"),
    orgs = useOrganizations();
  const [selectedOrg, setOrg] = useState(""),
    [selectedBranch, setBranch] = useState("");
  const org = selectedOrg || orgs.data?.[0]?.id || "";
  const branches = useBranches(org);
  const branch = selectedBranch || branches.data?.[0]?.id || "";
  const scope = { organizationId: org, branchId: branch };
  const q = usePracticeQuery<FinanceDto>(
    "business/coaching/finance",
    scope,
    Boolean(org && branch),
  );
  const candidates = usePracticeQuery<
    { userId: string; displayName: string | null; specialties: string[] }[]
  >("business/coaching/candidates", scope, Boolean(org && branch));
  const a = usePracticeAction();
  const role = orgs.data?.find((x) => x.id === org)?.role;
  const manager = role === "owner" || role === "manager";
  const [commandKey, setCommandKey] = useState(() => crypto.randomUUID());
  const ledgerKeys = useRef(new Map<string, string>());
  const coaches = candidates.data ?? [];
  if (orgs.isLoading || branches.isLoading) return <Loading />;
  if (orgs.error) return <QueryError error={orgs.error} retry={orgs.refetch} />;
  if (branches.error)
    return <QueryError error={branches.error} retry={branches.refetch} />;
  return (
    <>
      <PracticeFeedback action={a} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          {t("club")}
          <NativeSelect
            value={org}
            onChange={(e) => {
              setOrg(e.target.value);
              setBranch("");
            }}
          >
            {orgs.data?.map((o) => (
              <NativeSelectOption key={o.id} value={o.id}>
                {o.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-2">
          {t("branch")}
          <NativeSelect
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.data?.map((b) => (
              <NativeSelectOption key={b.id} value={b.id}>
                {b.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      {candidates.error && (
        <QueryError error={candidates.error} retry={candidates.refetch} />
      )}{" "}
      {!coaches.length && <p>{t("noAffiliatedCoaches")}</p>}
      {manager && coaches.length > 0 && (
        <Form
          title={t("createOffering")}
          pending={a.pending}
          onSubmit={(f) => {
            const body = {
              mode: text(f, "mode"),
              entryAmountMinor: String(
                BigInt(text(f, "entry") || "0") * BigInt(10),
              ),
              idempotencyKey: commandKey,
              service: {
                ...scope,
                title: text(f, "title"),
                kind: text(f, "kind"),
                coachUserId: text(f, "coach"),
                coachName:
                  coaches.find((c) => c.userId === text(f, "coach"))
                    ?.displayName ?? "",
                amountMinor: String(BigInt(text(f, "price")) * BigInt(10)),
                durationDays: text(f, "kind") === "membership" ? 30 : null,
                sessionCount:
                  text(f, "kind") === "membership"
                    ? Number(text(f, "sessionCount"))
                    : null,
                approvalRequired: checked(f, "approval"),
                policy: {
                  cancellationHours: Number(text(f, "cancellationHours")),
                  lateRefundBasisPoints: 0,
                  noShowConsumesSession: checked(f, "noShow"),
                  consumeOn: "attendance",
                  freezeDays: 7,
                  depositBasisPoints: 0,
                  guestAllowance: 0,
                  transferable: false,
                  terms: text(f, "terms"),
                },
              },
            };
            void a.run("business/coaching/offerings", body).then((ok) => {
              if (ok) setCommandKey(crypto.randomUUID());
            });
          }}
        >
          <Field name="title" label={t("serviceTitle")} required />
          <Field name="coach" label={t("coach")}>
            <NativeSelect name="coach">
              {coaches.map((c) => (
                <NativeSelectOption key={c.userId} value={c.userId}>
                  {c.displayName ?? t("coach")}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field name="mode" label={t("serviceMode")}>
            <NativeSelect name="mode">
              {(
                [
                  ["private", "private"],
                  ["semi_private", "semiPrivate"],
                  ["online", "online"],
                  ["introduction", "introduction"],
                ] as const
              ).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {t(label)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field name="kind" label={t("kind")}>
            <NativeSelect name="kind">
              <NativeSelectOption value="class">
                {t("singleSession")}
              </NativeSelectOption>
              <NativeSelectOption value="membership">
                {t("package")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field
            name="price"
            type="number"
            label={t("totalPriceToman")}
            required
          />
          <Field
            name="entry"
            type="number"
            label={t("entryIncludedToman")}
            value={0}
          />
          <Field
            name="sessionCount"
            type="number"
            label={t("sessionCount")}
            value={8}
          />
          <Field
            name="cancellationHours"
            type="number"
            label={t("cancellationHours")}
            value={12}
          />
          <Check name="approval" label={t("approvalNeeded")} />
          <Check name="noShow" label={t("noShowConsumes")} />
          <Field name="terms" type="textarea" label={t("terms")} required />
          <p>{t("recipientHint")}</p>
        </Form>
      )}
      {manager && coaches.length > 0 && (
        <Form
          title={t("newContract")}
          pending={a.pending}
          onSubmit={(f) =>
            void a.run("business/coaching/contracts", {
              ...scope,
              coachId: text(f, "coach"),
              startsOn: text(f, "startsOn"),
              endsOn: text(f, "endsOn") || null,
              shareBasisPoints: Math.round(Number(text(f, "share")) * 100),
              basis: text(f, "basis"),
              costsMinor: String(BigInt(text(f, "costs") || "0") * BigInt(10)),
              terms: text(f, "terms"),
            })
          }
        >
          <Field name="coach" label={t("coach")}>
            <NativeSelect name="coach">
              {coaches.map((c) => (
                <NativeSelectOption key={c.userId} value={c.userId}>
                  {c.displayName ?? t("coach")}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field name="startsOn" type="date" label={t("startsAt")} required />
          <Field name="endsOn" type="date" label={t("endsAt")} />
          <Field
            name="share"
            type="number"
            label={t("sharePercent")}
            value={50}
            required
          />
          <Field name="basis" label={t("basis")}>
            <NativeSelect name="basis">
              <NativeSelectOption value="gross">
                {t("gross")}
              </NativeSelectOption>
              <NativeSelectOption value="net">{t("net")}</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field name="costs" type="number" label={t("costsToman")} value={0} />
          <Field name="terms" type="textarea" label={t("terms")} required />
          <p>{t("versionHint")}</p>
        </Form>
      )}
      {q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : q.isLoading ? (
        <Loading />
      ) : (
        <>
          <p>{t("financeHint")}</p>
          {q.data?.contracts.map((c) => (
            <article key={c.id} className="space-y-4 rounded-3xl border p-5">
              <h2>
                {c.branchName} · {t("version")} {c.version}
              </h2>
              <p>{c.terms}</p>
              <Form
                title={t("recordLedger")}
                pending={a.pending}
                onSubmit={(f) => {
                  if (!ledgerKeys.current.has(c.id))
                    ledgerKeys.current.set(c.id, crypto.randomUUID());
                  void a
                    .run("business/coaching/ledger", {
                      contractId: c.id,
                      kind: text(f, "kind"),
                      amountMinor: String(
                        BigInt(text(f, "amount")) * BigInt(10),
                      ),
                      reservationId: text(f, "reservation") || null,
                      reference: text(f, "reference"),
                      confirmed: checked(f, "confirmed"),
                      idempotencyKey: ledgerKeys.current.get(c.id)!,
                    })
                    .then((ok) => {
                      if (ok) ledgerKeys.current.delete(c.id);
                    });
                }}
              >
                <Field name="kind" label={t("kind")}>
                  <NativeSelect name="kind">
                    <NativeSelectOption value="income">
                      {t("income")}
                    </NativeSelectOption>
                    <NativeSelectOption value="payment">
                      {t("payment")}
                    </NativeSelectOption>
                    <NativeSelectOption value="adjustment">
                      {t("adjustment")}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field
                  name="amount"
                  type="number"
                  min={-1000000000000}
                  label={t("amountToman")}
                  required
                />
                <Field name="reservation" label={t("reservationReference")}>
                  <NativeSelect name="reservation">
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {q.data?.bookings
                      ?.filter((b) => b.coachId === c.coachId)
                      .map((b) => (
                        <NativeSelectOption key={b.id} value={b.id}>
                          {b.title} · {date(b.startAt)}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Field>
                <Field
                  name="reference"
                  label={t("paymentReference")}
                  required
                />
                <Check name="confirmed" label={t("confirmAmount")} />
              </Form>
            </article>
          ))}
          {q.data?.ledger.map((l) => (
            <article key={l.id} className="rounded-3xl border p-4">
              <p>
                {t(
                  l.kind === "income"
                    ? "income"
                    : l.kind === "payment"
                      ? "payment"
                      : "adjustment",
                )}{" "}
                · <PracticeMoney value={l.amountMinor} />
              </p>
              <p>
                {t(l.confirmed ? "confirmedAmount" : "estimated")} ·{" "}
                {l.reference}
              </p>
            </article>
          ))}
        </>
      )}
    </>
  );
}

function ReviewReports() {
  const t = useTranslations("Practice"),
    q = usePracticeQuery<CoachReviewReportDto[]>("admin/coaching/reports"),
    a = usePracticeAction();
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t("reportedReviews")}</h2>
      <PracticeFeedback action={a} />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <QueryError error={q.error} retry={q.refetch} />
      ) : !q.data?.length ? (
        <p>{t("emptyReviewQueue")}</p>
      ) : (
        q.data.map((r) => (
          <article key={r.id} className="space-y-3 rounded-3xl border p-5">
            <p>{r.body}</p>
            <p>
              {t("reportReview")}: {r.reason}
            </p>
            {r.reply && (
              <p>
                {t("coachReply")}: {r.reply}
              </p>
            )}
            <p>{t(r.status === "pending" ? "pending" : "resolved")}</p>
            {r.decisions.map((d, i) => (
              <p key={i}>
                <PracticeDate value={d.createdAt} /> ·{" "}
                {t(d.hidden ? "hiddenReview" : "keptReview")} · {d.reason}
              </p>
            ))}
            <Form
              key={r.revision}
              title={t("decision")}
              pending={a.pending}
              onSubmit={(f) =>
                void a.run(`admin/coaching/reports/${r.id}/resolve`, {
                  hidden: checked(f, "hidden"),
                  reason: text(f, "reason"),
                  revision: r.revision,
                })
              }
            >
              <Check
                name="hidden"
                label={t("hiddenReview")}
                checked={r.hidden}
              />
              <Field name="reason" label={t("reason")} required />
            </Form>
          </article>
        ))
      )}
    </section>
  );
}
