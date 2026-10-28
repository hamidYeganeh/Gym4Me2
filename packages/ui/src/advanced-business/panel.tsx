"use client";
import {
  useAdvanced,
  useAdvancedOptions,
  type AdvancedSurface,
} from "@repo/api/advanced-business";
import { useAccount } from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { Input as KitInput } from "@repo/ui/kit/Input";
import Link from "next/link";
import { useState } from "react";
import { Loading, QueryError } from "../account/common";
import {
  ArrowUpRightIcon as ArrowUpRight,
  Building2Icon as Building2,
  Note1Icon as ReceiptText,
  WalletIcon as Wallet,
} from "../icons";
import { FilterSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { MotionDisclosure, SlidingSegments } from "../motion-controls";
import "../workspace-design.css";
import { PriceSettings, SharedMemberships } from "./branch-controls";
import {
  Field,
  Form,
  Money,
  Reason,
  Select,
  useFinancialDate,
  value,
} from "./forms";
import "./ph5.css";
import { PlanControls } from "./plans";
import { Statement } from "./statement";
export function AdvancedBusinessPanel({
  surface,
}: {
  surface: AdvancedSurface;
}) {
  const date = useFinancialDate();
  const t = useTranslations("PH5"),
    account = useAccount(),
    scopes = useAdvancedOptions(surface);
  const [page, setPage] = useState(1);
  const [org, setOrg] = useState(""),
    [branch, setBranch] = useState(""),
    [range, setRange] = useState({ from: "", to: "" }),
    [tab, setTab] = useState("statements");
  const options = scopes.data?.organizations ?? [];
  const organizationId = org || options[0]?.id || "";
  const selectedOrg = options.find((o) => o.id === organizationId);
  const canManage =
    surface === "business" &&
    ["owner", "manager"].includes(selectedOrg?.role ?? "");
  const allowedBranches =
    scopes.data?.branches.filter((b) => b.organization_id === organizationId) ??
    [];
  const branchId =
    branch || (!selectedOrg?.all_branches ? allowedBranches[0]?.id : undefined);
  const query = useAdvanced(surface, {
    organizationId,
    page,
    branchId,
    from: range.from || undefined,
    to: range.to || undefined,
  });
  const data = query.data;
  const scopeBranch = allowedBranches.find((b) => b.id === branchId);
  const owner = surface === "business" && selectedOrg?.role === "owner";
  if (!account.data && account.isLoading) return <Loading />;
  return (
    <main
      data-ph5-surface={surface}
      className="gym-workspace ph5-panel mx-auto min-h-dvh max-w-6xl space-y-6 px-4 py-7 sm:px-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {t(surface === "coach" ? "coachSpace" : "businessSpace")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t("intro")}
          </p>
        </div>
        <Button asChild variant="outline" size="icon">
          <Link
            href={surface === "coach" ? "/coaching" : "/"}
            aria-label={t("back")}
          >
            <ArrowUpRight size={18} />
          </Link>
        </Button>
      </header>
      <div className="ph5-scope">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {selectedOrg?.name ?? t("chooseOrganization")}
          </p>
          {selectedOrg && (
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {scopeBranch?.name ?? t("allBranches")}
              {range.from && (
                <>
                  {" "}
                  · {t("from")} {date(range.from)}
                </>
              )}
              {range.to && (
                <>
                  {" "}
                  · {t("to")} {date(range.to)}
                </>
              )}
            </p>
          )}
        </div>
        <FilterSheet
          count={[branch, range.from, range.to].filter(Boolean).length}
          onReset={() => {
            setRange({ from: "", to: "" });
            setBranch("");
            setPage(1);
          }}
        >
          <Field name="organization" label={t("organization")}>
            <NativeSelect
              value={organizationId}
              onChange={(e) => {
                setPage(1);
                setOrg(e.target.value);
                setBranch("");
              }}
            >
              <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
              {options.map((o) => (
                <NativeSelectOption key={o.id} value={o.id}>
                  {o.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {surface !== "coach" && (
            <Field name="branch" label={t("branch")}>
              <NativeSelect
                value={branchId ?? ""}
                onChange={(e) => {
                  setPage(1);
                  setBranch(e.target.value);
                }}
              >
                {selectedOrg?.all_branches && (
                  <NativeSelectOption value="">
                    {t("allBranches")}
                  </NativeSelectOption>
                )}
                {allowedBranches.map((b) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field name="from" label={t("from")}>
            <KitInput
              type="date"
              className="min-h-11 rounded-xl border px-3"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => {
                setPage(1);
                setRange((r) => ({ ...r, from: e.target.value }));
              }}
            />
          </Field>
          <Field name="to" label={t("to")}>
            <KitInput
              type="date"
              className="min-h-11 rounded-xl border px-3"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => {
                setPage(1);
                setRange((r) => ({ ...r, to: e.target.value }));
              }}
            />
          </Field>
        </FilterSheet>
      </div>
      {scopes.error ? (
        <QueryError error={scopes.error} retry={scopes.refetch} />
      ) : !organizationId ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            {t(surface === "coach" ? "noStatements" : "chooseOrganization")}
          </CardContent>
        </Card>
      ) : query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <QueryError error={query.error} retry={query.refetch} />
      ) : (
        data && (
          <>
            <div className="ph5-totals">
              {(
                [
                  [
                    "earned",
                    ReceiptText,
                    data.totals
                      ? BigInt(data.totals.earned_minor) +
                        BigInt(data.totals.adjusted_minor)
                      : data.statements.reduce(
                          (n, s) =>
                            n +
                            BigInt(s.earned_minor) +
                            BigInt(s.adjusted_minor),
                          BigInt(0),
                        ),
                  ],
                  [
                    "paid",
                    Wallet,
                    data.totals
                      ? BigInt(data.totals.paid_minor)
                      : data.statements.reduce(
                          (n, s) => n + BigInt(s.paid_minor),
                          BigInt(0),
                        ),
                  ],
                  [
                    "remaining",
                    Building2,
                    data.totals
                      ? BigInt(data.totals.earned_minor) +
                        BigInt(data.totals.adjusted_minor) -
                        BigInt(data.totals.paid_minor)
                      : data.statements.reduce(
                          (n, s) =>
                            n +
                            BigInt(s.earned_minor) +
                            BigInt(s.adjusted_minor) -
                            BigInt(s.paid_minor),
                          BigInt(0),
                        ),
                  ],
                ] as const
              ).map(([label, Icon, n]) => (
                <Card key={label} className="gap-0 py-0">
                  <CardContent className="space-y-2 px-3 py-4 sm:px-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {t(label)}
                      <Icon size={18} className="hidden sm:block" />
                    </div>
                    <p className="break-words text-base font-semibold sm:text-xl">
                      <Money amount={String(n)} />
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="max-w-full overflow-x-auto pb-1">
              <SlidingSegments
                className="ph5-navigation"
                label={t("sections")}
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setPage(1);
                }}
                options={(surface === "coach"
                  ? (["statements"] as const)
                  : surface === "admin"
                    ? (["statements", "plans"] as const)
                    : ([
                        "statements",
                        "contracts",
                        "branches",
                        "plans",
                        "reports",
                      ] as const)
                ).map((v) => ({ value: v, label: t(v) }))}
              />
            </div>
            {tab === "statements" && (
              <>
                {surface === "business" && (
                  <MotionDisclosure
                    className="rounded-2xl border border-border px-4"
                    label={t("closePeriod")}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("closePeriod")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-5 text-sm text-muted-foreground">
                          {t("closeHint")}
                        </p>
                        <Form
                          surface={surface}
                          path="statements"
                          label={t("closePeriod")}
                          disabled={!data.subscription?.advanced_finance}
                          build={(f) => ({
                            organizationId,
                            branchId: value(f, "branch"),
                            coachId: value(f, "coach"),
                            from: value(f, "from"),
                            to: value(f, "to"),
                          })}
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t("branch")} name="branch">
                              <Select name="branch">
                                {data.branches.map((b) => (
                                  <NativeSelectOption key={b.id} value={b.id}>
                                    {b.name}
                                  </NativeSelectOption>
                                ))}
                              </Select>
                            </Field>
                            <Field label={t("coach")} name="coach">
                              <Select name="coach">
                                {[
                                  ...new Map(
                                    data.contracts.map((c) => [c.coach_id, c]),
                                  ).values(),
                                ].map((c) => (
                                  <NativeSelectOption
                                    key={c.coach_id}
                                    value={c.coach_id}
                                  >
                                    {c.coach_name || c.coach_id}
                                  </NativeSelectOption>
                                ))}
                              </Select>
                            </Field>
                            <Field label={t("from")} name="from" type="date" />
                            <Field
                              label={t("to")}
                              name="to"
                              type="date"
                              max={new Date(Date.now() - 86400000)
                                .toISOString()
                                .slice(0, 10)}
                            />
                          </div>
                        </Form>
                      </CardContent>
                    </Card>
                  </MotionDisclosure>
                )}
                {!data.statements.length && (
                  <p className="py-8 text-center text-muted-foreground">
                    {t("noStatements")}
                  </p>
                )}
                {data.statements.map((s) => (
                  <Statement
                    key={s.id}
                    statement={s}
                    data={data}
                    surface={surface}
                  />
                ))}
              </>
            )}
            {tab === "plans" && (
              <PlanControls
                surface={surface}
                organizationId={organizationId}
                data={data}
                owner={!!owner}
              />
            )}
            {tab === "contracts" && (
              <>
                <p className="text-sm text-muted-foreground">{t("ruleHint")}</p>
                <Button asChild variant="outline">
                  <Link href="/coaching">{t("newContract")}</Link>
                </Button>
                {data.contracts.map((c) => (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle>
                        {c.coach_name} · {t("version", { n: c.version })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {date(c.starts_on)} —{" "}
                        {c.ends_on ? date(c.ends_on) : t("ongoing")} ·{" "}
                        {c.share_basis_points / 100}%
                      </p>
                      {c.mode ? (
                        <p>
                          {t("ruleSaved")} · {t(c.mode)}
                        </p>
                      ) : (
                        <Form
                          surface={surface}
                          path="rules"
                          label={t("saveRule")}
                          disabled={
                            !data.subscription?.advanced_finance || !canManage
                          }
                          build={(f) => ({
                            contractId: c.id,
                            mode: value(f, "mode"),
                            amountMinor: value(f, "amount"),
                            discountPayer: value(f, "discount"),
                            spaceMinor: value(f, "space"),
                            platformBps: Number(value(f, "platform")),
                            reason: value(f, "reason"),
                          })}
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t("calculation")} name="mode">
                              <Select name="mode">
                                {(
                                  [
                                    "percentage",
                                    "per_session",
                                    "fixed",
                                  ] as const
                                ).map((v) => (
                                  <NativeSelectOption key={v} value={v}>
                                    {t(v)}
                                  </NativeSelectOption>
                                ))}
                              </Select>
                            </Field>
                            <Field
                              label={t("fixedAmount")}
                              name="amount"
                              type="number"
                              min="0"
                              defaultValue="0"
                            />
                            <Field label={t("discountPayer")} name="discount">
                              <Select name="discount">
                                <NativeSelectOption value="shared">
                                  {t("shared")}
                                </NativeSelectOption>
                                <NativeSelectOption value="business">
                                  {t("business")}
                                </NativeSelectOption>
                              </Select>
                            </Field>
                            <Field
                              label={t("spaceCost")}
                              name="space"
                              type="number"
                              min="0"
                              defaultValue="0"
                            />
                            <Field
                              label={t("platformFee")}
                              name="platform"
                              type="number"
                              min="0"
                              max="10000"
                              defaultValue="0"
                            />
                          </div>
                          <Reason />
                        </Form>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            {tab === "branches" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.branches.map((b) => (
                    <Card key={b.id}>
                      <CardHeader>
                        <CardTitle>{b.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p>{t(b.active ? "active" : "inactive")}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("futureBookings", { count: b.future_bookings })}
                        </p>
                        <Form
                          surface={surface}
                          path="branches"
                          label={t(b.active ? "deactivate" : "reactivate")}
                          disabled={!owner}
                          build={(f) => ({
                            organizationId,
                            branchId: b.id,
                            revision: b.revision,
                            active: !b.active,
                            acknowledgeFuture: f.get("ack") === "on",
                            reason: value(f, "reason"),
                          })}
                        >
                          <label className="flex items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              name="ack"
                              required
                              className="mt-1"
                            />
                            {t("branchObligations")}
                          </label>
                          <Reason />
                        </Form>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <PriceSettings
                  surface={surface}
                  org={organizationId}
                  data={data}
                  owner={!!owner}
                  canManage={canManage}
                />
                <SharedMemberships
                  surface={surface}
                  data={data}
                  owner={!!owner}
                />
              </>
            )}
            {tab === "reports" && data.report && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("reports")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    {t("reportHint")}
                  </p>
                  <dl className="grid gap-5 sm:grid-cols-2">
                    {(
                      [
                        ["sold", data.report.sold_minor],
                        ["collected", data.report.collected_minor],
                      ] as const
                    ).map(([k, n]) => (
                      <div key={k}>
                        <dt className="text-sm text-muted-foreground">
                          {t(k!)}
                        </dt>
                        <dd className="mt-1 text-xl">
                          <Money amount={n!} />
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt>{t("uniqueMembers")}</dt>
                      <dd>{data.report.unique_members}</dd>
                    </div>
                    <div>
                      <dt>{t("renewalRate")}</dt>
                      <dd>
                        {data.report.renewal_denominator
                          ? Math.round(
                              (data.report.renewals /
                                data.report.renewal_denominator) *
                                100,
                            ) + "%"
                          : t("noData")}{" "}
                        ({data.report.renewals}/
                        {data.report.renewal_denominator})
                      </dd>
                    </div>
                    <div>
                      <dt>{t("capacity")}</dt>
                      <dd>{data.report.capacity}</dd>
                    </div>
                  </dl>
                  <div className="grid gap-3">
                    {data.comparison?.map((b) => (
                      <div
                        key={b.id}
                        className="space-y-2 rounded-2xl border p-4"
                      >
                        <h3 className="font-medium">{b.name}</h3>
                        <p className="text-sm">
                          {t("sold")}: <Money amount={b.sold_minor} />
                        </p>
                        <p className="text-sm">
                          {t("allocated")}: <Money amount={b.allocated_minor} />
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("membersCount", { count: b.members })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/reports">{t("detailedReports")}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {["statements", "branches"].includes(tab) && (
              <nav
                aria-label={t("pagination")}
                className="flex items-center justify-between gap-3"
              >
                <Button
                  variant="outline"
                  disabled={page === 1 || query.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("page", { n: page })}
                </span>
                <Button
                  variant="outline"
                  disabled={
                    query.isFetching ||
                    !(tab === "statements"
                      ? data.pages?.statements
                      : data.pages?.memberships)
                  }
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </Button>
              </nav>
            )}
          </>
        )
      )}
    </main>
  );
}
