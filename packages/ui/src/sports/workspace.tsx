"use client";
import { BusinessFieldSteps } from "../account/business-form-steps";
import { BusinessFormSteps } from "../account/business-form-steps";
import { SuccessNotice } from "../account/common";
import { IranianDateTimeInput } from "../kit/IranianDateInput";
import { LegacyReadiness } from "./legacy-readiness";
import { OfferingFields, readOffering } from "./offering-fields";
import { BottomSheet, FilterSheet } from "../kit/BottomSheet";
import { ConfirmAction } from "../confirm-action";
import {
  useManagementFilters,
  ManagementFilterBar,
} from "./management-filters";
import { Pager } from "../account/admin";
import "../workspace-design.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { useLocale, useTranslations } from "@repo/i18n";
import { useOrganizations, useBranches } from "@repo/api/business";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
  type TicketDto,
  type DocumentReviewDto,
  type CouponDto,
  type OccurrenceSeriesDto,
  type OccurrenceSeriesInput,
  type HostCalendarDto,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { cn } from "../lib/utils";
import { AnimatedThemeToggler } from "../kit/AnimatedThemeToggler";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { Status, Blank, FormField } from "./shared";
import { Reception } from "./reception";
import { Members, Payments, Reports, Imports } from "./operations";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";
import { ResourceManager } from "./resources";
import { SessionManager, AdminSchedulePanel } from "./session-management";
import { OccurrenceSeriesManager } from "./occurrence-series";
import { ServiceCoverEditor } from "./cover";
import { CalendarManager } from "./calendars";
import {
  ServiceEligibilityFields,
  readServiceEligibility,
} from "./eligibility";
type Page =
  | "services"
  | "resources"
  | "reception"
  | "members"
  | "payments"
  | "reports"
  | "imports"
  | "calendar";
function rialToTomanInput(value: string) {
  const rial = BigInt(value);
  const whole = (rial / BigInt(10)).toString();
  const tenth = rial % BigInt(10);
  return tenth === BigInt(0) ? whole : `${whole}.${tenth}`;
}
function tomanInputToRial(value: string) {
  if (!/^\d+(?:\.\d)?$/.test(value)) return null;
  const [whole = "0", tenth = "0"] = value.split(".");
  return (BigInt(whole) * BigInt(10) + BigInt(tenth)).toString();
}
export function SportsFrame({
  children,
  title,
  className,
  focused = false,
}: {
  children: ReactNode;
  title: string;
  className?: string;
  focused?: boolean;
}) {
  const t = useTranslations("Luma");
  const account = useTranslations("AccountDesign");
  const locale = useLocale();
  const pathname = usePathname();
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const row = nav.getBoundingClientRect(),
      item = current.getBoundingClientRect();
    if (item.left < row.left || item.right > row.right)
      nav.scrollLeft += item.left + item.width / 2 - row.left - row.width / 2;
  }, [pathname]);
  const changeLocale = useChangeLocale();
  const [changingLocale, startLocaleChange] = useTransition();
  return (
    <main
      className={cn(
        "gym-workspace min-h-dvh bg-muted/40 p-5 sm:p-10 [&_button]:min-h-11 [&_button]:min-w-11 [&_select]:min-h-11",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold break-words min-w-0">{title}</h1>
          {!focused && (
            <div className="flex flex-wrap items-center gap-3">
              <NativeSelect
                className="min-h-11 [&_select]:min-h-11"
                aria-label={t("language")}
                value={locale}
                disabled={changingLocale}
                onChange={(e) => {
                  const value = e.target.value === "en" ? "en" : "fa";
                  startLocaleChange(async () => {
                    await changeLocale(value);
                  });
                }}
              >
                <NativeSelectOption value="fa">
                  {t("languageNameFa")}
                </NativeSelectOption>
                <NativeSelectOption value="en">
                  {t("languageNameEn")}
                </NativeSelectOption>
              </NativeSelect>
              <AnimatedThemeToggler
                className="min-h-11 min-w-11"
                label={account("toggleTheme")}
                size="icon-lg"
              />
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center"
                href="/"
              >
                {t("home")}
              </Link>
            </div>
          )}
        </header>
        {!focused && (
          <nav
            ref={navigation}
            className="sports-context-navigation flex gap-2 overflow-x-auto pb-2 mb-6"
            aria-label={t("navigation")}
          >
            {(
              [
                "services",
                "resources",
                "reception",
                "members",
                "payments",
                "reports",
                "imports",
                "calendar",
                "messages",
              ] as const
            ).map((key) => (
              <Button
                asChild
                variant={
                  pathname === `/${key}` ||
                  (key === "messages" && pathname?.startsWith("/messages/"))
                    ? "default"
                    : "outline"
                }
                className="min-h-11 shrink-0"
                key={key}
              >
                <Link
                  href={`/${key}`}
                  aria-current={
                    pathname === `/${key}` ||
                    (key === "messages" && pathname?.startsWith("/messages/"))
                      ? "page"
                      : undefined
                  }
                >
                  {t(key)}
                </Link>
              </Button>
            ))}
          </nav>
        )}
        {children}
      </div>
    </main>
  );
}
export function SportsWorkspace({ page }: { page: Page }) {
  const t = useTranslations("Luma");
  const organizations = useOrganizations();
  const [organization, setOrganization] = useState("");
  const org = organization || organizations.data?.[0]?.id;
  const role = organizations.data?.find((item) => item.id === org)?.role;
  const canManage = role === "owner" || role === "manager";
  const canOperate = canManage || role === "receptionist";
  const canUsePage =
    page === "resources"
      ? canManage
      : page === "reception" || page === "members" || page === "imports"
        ? canOperate
        : page === "reports"
          ? canManage || role === "accountant"
          : Boolean(role);
  const branches = useBranches(org);
  const [branchSelection, setBranch] = useState("");
  const branch = branchSelection || branches.data?.[0]?.id;
  const enabled = Boolean(org && branch);
  const needsServices = ["imports", "calendar"].includes(page);
  const scope = { organizationId: org, branchId: branch };
  const services = useSportsQuery<ServiceDto[]>(
    "business/sports/services",
    scope,
    enabled && needsServices && canUsePage,
  );
  const title = t(page);
  const error =
    organizations.error ??
    branches.error ??
    (needsServices && canUsePage ? services.error : null);
  const loading =
    organizations.isPending ||
    Boolean(org && branches.isPending) ||
    (enabled && needsServices && canUsePage && services.isPending);
  if (error?.status === 401)
    return (
      <SportsFrame title={title}>
        <QueryError error={error} />
      </SportsFrame>
    );
  return (
    <SportsFrame title={title}>
      <FilterSheet>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <FormField label={t("organization")}>
            <NativeSelect
              className="min-h-11 w-full [&_select]:min-h-11"
              value={org ?? ""}
              disabled={organizations.isPending || !organizations.data?.length}
              onChange={(e) => {
                setOrganization(e.target.value);
                setBranch("");
              }}
            >
              {organizations.data?.map((o) => (
                <NativeSelectOption value={o.id} key={o.id}>
                  {o.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={t("branch")}>
            <NativeSelect
              className="min-h-11 w-full [&_select]:min-h-11"
              value={branch ?? ""}
              disabled={branches.isPending || !branches.data?.length}
              onChange={(e) => setBranch(e.target.value)}
            >
              {branches.data?.map((b) => (
                <NativeSelectOption value={b.id} key={b.id}>
                  {b.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </FilterSheet>
      <QueryError
        error={error}
        retry={() => {
          const requests: Promise<unknown>[] = [organizations.refetch()];
          if (org) requests.push(branches.refetch());
          if (enabled && needsServices && canUsePage)
            requests.push(services.refetch());
          return Promise.allSettled(requests);
        }}
      />
      {error ? null : loading ? (
        <Loading />
      ) : !enabled ? (
        <Blank>{t("empty")}</Blank>
      ) : !canUsePage ? (
        <Blank>{t("workspaceAccessDenied")}</Blank>
      ) : (
        <>
          {page === "services" && canManage && (
            <LegacyReadiness org={org!} branch={branch!} />
          )}
          {page === "services" && (
            <Services
              org={org!}
              branch={branch!}
              canManage={canManage}
              key={`${org}:${branch}`}
            />
          )}{" "}
          {page === "resources" && (
            <ResourceManager
              key={`${org}:${branch}`}
              org={org!}
              branch={branch!}
            />
          )}{" "}
          {page === "reception" && (
            <Reception key={`${org}:${branch}`} org={org!} branch={branch!} />
          )}{" "}
          {page === "members" && (
            <Members key={`${org}:${branch}`} org={org!} branch={branch!} />
          )}{" "}
          {page === "payments" && (
            <Payments key={`${org}:${branch}`} org={org!} branch={branch!} />
          )}{" "}
          {page === "reports" && <Reports org={org!} branch={branch!} />}{" "}
          {page === "imports" && <Imports services={services.data ?? []} />}{" "}
          {page === "calendar" && (
            <div className="grid gap-6">
              <CalendarManager
                key={`${org}:${branch}`}
                org={org!}
                branch={branch!}
              />
              <Calendar
                services={services.data ?? []}
                org={org!}
                branch={branch!}
              />
            </div>
          )}
        </>
      )}
    </SportsFrame>
  );
}
function Services({
  org,
  branch,
  canManage,
}: {
  org: string;
  branch: string;
  canManage: boolean;
}) {
  const t = useTranslations("Luma");
  const list = useManagementFilters("services", `${org}:${branch}`);
  const query = useSportsQuery<ServiceDto[]>("business/sports/services", {
    organizationId: org,
    branchId: branch,
    ...list.filters,
  });
  const services = query.data ?? [],
    loading = query.isPending;
  const create = useSportsCommand("business/sports/services");
  const resources = useSportsQuery<{ id: string; name: string }[]>(
    "business/sports/resources",
    { organizationId: org, branchId: branch },
    canManage,
  );
  const [kind, setKind] = useState<ServiceDto["kind"]>("class");
  const coaches = useSportsQuery<
    { userId: string; displayName: string | null }[]
  >(
    "business/coaching/candidates",
    { organizationId: org, branchId: branch },
    canManage,
  );
  const [formOpen, setFormOpen] = useState(false);
  return (
    <div className="grid gap-6">
      <ManagementFilterBar
        value={list.filters}
        onApply={list.apply}
        statuses={["draft", "published", "archived"]}
        kinds
      />
      <QueryError error={query.error} retry={query.refetch} />
      <SuccessNotice success={create.isSuccess} message={t("created")} />
      {canManage && (
        <Button onClick={() => setFormOpen((v) => !v)}>
          {t("newService")}
        </Button>
      )}
      <BottomSheet
        open={formOpen && canManage}
        onOpenChange={(open) => {
          if (!create.isPending) setFormOpen(open);
        }}
        title={t("newService")}
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const price = String(f.get("price") ?? "0");
            if (!/^\d+$/.test(price)) return;
            create.mutate(
              {
                organizationId: org,
                branchId: branch,
                title: f.get("title"),
                description: f.get("description"),
                kind: f.get("kind"),
                sportId: f.get("sportId") || null,
                offering: readOffering(f),
                coachUserId: f.get("coachUserId") || null,
                amountMinor: (BigInt(price) * BigInt(10)).toString(),
                currency: "IRR",
                durationDays: f.get("duration")
                  ? Number(f.get("duration"))
                  : null,
                sessionCount: f.get("sessions")
                  ? Number(f.get("sessions"))
                  : null,
                resourceIds: f.getAll("resources"),
                requirements: String(f.get("requirements") ?? "")
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean),
                eligibility: readServiceEligibility(f),
                level: f.get("level"),
                coachName: f.get("coach"),
                visibility: f.get("visibility"),
                approvalRequired: f.has("approval"),
                showParticipants: f.has("participants"),
                policy: {
                  cancellationHours: Number(f.get("cutoff")),
                  lateRefundBasisPoints: Number(f.get("refund")) * 100,
                  noShowConsumesSession: f.has("noShow"),
                  consumeOn: f.get("consumeOn"),
                  freezeDays: Number(f.get("freeze")),
                  depositBasisPoints: Number(f.get("deposit")) * 100,
                  guestAllowance: Number(f.get("guests")),
                  transferable: f.has("transfer"),
                  terms: f.get("terms"),
                },
              },
              {
                onSuccess: () => {
                  form.reset();
                  setFormOpen(false);
                },
              },
            );
          }}
        >
          <BusinessFormSteps
            key={String(formOpen)}
            labels={[t("newService"), t("price"), t("conditions")]}
          >
            <div className="grid gap-4">
              <FormField label={t("title")}>
                <Input name="title" minLength={2} maxLength={160} required />
              </FormField>
              <FormField label={t("kind")}>
                <NativeSelect
                  name="kind"
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as ServiceDto["kind"])
                  }
                >
                  {(
                    [
                      "class",
                      "course",
                      "court",
                      "access",
                      "membership",
                    ] as const
                  ).map((kind) => (
                    <NativeSelectOption key={kind} value={kind}>
                      {t(`kinds.${kind}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <OfferingFields kind={kind} services={services} />
              <FormField label={t("coach")}>
                <NativeSelect name="coachUserId" required={kind === "program"}>
                  <NativeSelectOption value="">
                    {t("chooseSession")}
                  </NativeSelectOption>
                  {coaches.data?.map((c) => (
                    <NativeSelectOption key={c.userId} value={c.userId}>
                      {c.displayName ?? c.userId}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label={t("description")}>
                <Textarea name="description" maxLength={10000} />
              </FormField>
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                {t("serviceCoverAfterCreate")}
              </p>
            </div>
            <div className="grid gap-4">
              <FormField label={`${t("price")} (${t("toman")})`}>
                <Input
                  name="price"
                  type="number"
                  step="1"
                  min="0"
                  max="1000000000000"
                  required
                  defaultValue="0"
                />
              </FormField>
              <FormField label={t("days")}>
                <Input name="duration" type="number" min="1" max="3660" />
              </FormField>
              <FormField label={t("sessions")}>
                <Input name="sessions" type="number" min="1" max="10000" />
              </FormField>
              <FormField label={t("level")}>
                <Input name="level" maxLength={80} defaultValue="" />
              </FormField>
              <FormField label={t("coach")}>
                <Input name="coach" maxLength={120} defaultValue="" />
              </FormField>
              <FormField label={t("requiredDocuments")}>
                <Textarea name="requirements" placeholder={t("onePerLine")} />
              </FormField>
            </div>
            <div className="grid gap-4">
              <ServiceEligibilityFields />
              <FormField label={t("conditions")}>
                <Textarea
                  name="terms"
                  minLength={10}
                  maxLength={10000}
                  required
                />
              </FormField>
              <FormField label={t("cancelHours")}>
                <Input
                  name="cutoff"
                  type="number"
                  min="0"
                  max="8760"
                  required
                />
              </FormField>
              <FormField label={t("refundPercent")}>
                <Input name="refund" type="number" min="0" max="100" required />
              </FormField>
              <FormField label={t("freezeDays")}>
                <Input
                  name="freeze"
                  type="number"
                  min="0"
                  max="365"
                  defaultValue="0"
                  required
                />
              </FormField>
              <FormField label={t("depositPercent")}>
                <Input
                  name="deposit"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                  required
                />
              </FormField>
              <FormField label={t("guestAllowance")}>
                <Input
                  name="guests"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                  required
                />
              </FormField>
              <FormField label={t("consumeOn")}>
                <NativeSelect name="consumeOn">
                  <NativeSelectOption value="attendance">
                    {t("attendance")}
                  </NativeSelectOption>
                  <NativeSelectOption value="confirmation">
                    {t("registration")}
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label={t("visibility")}>
                <NativeSelect name="visibility">
                  <NativeSelectOption value="public">
                    {t("public")}
                  </NativeSelectOption>
                  <NativeSelectOption value="unlisted">
                    {t("unlisted")}
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3">{t("resources")}</legend>
                {resources.data?.map((r) => (
                  <label className="flex items-center gap-2" key={r.id}>
                    <input name="resources" value={r.id} type="checkbox" />
                    {r.name}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-col gap-3">
                {(
                  ["approval", "participants", "noShow", "transfer"] as const
                ).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input name={key} type="checkbox" />
                    {t(key)}
                  </label>
                ))}
              </div>
              <div className="sm:col-span-2">
                <QueryError error={create.error} />
                <Button type="submit" disabled={create.isPending}>
                  {t("save")}
                </Button>
              </div>
            </div>
          </BusinessFormSteps>
        </form>
      </BottomSheet>
      {loading ? (
        <Loading />
      ) : (
        !query.error &&
        services.length === 0 && <Blank>{t("noBranchServices")}</Blank>
      )}
      {!query.error &&
        services.map((s) =>
          canManage ? (
            <ServiceActions key={s.id} service={s} />
          ) : (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Status value={s.status} />
                <p className="text-sm text-muted-foreground">
                  {t(`kinds.${s.kind}`)}
                </p>
              </CardContent>
            </Card>
          ),
        )}
      <Pager
        page={list.filters.page}
        setPage={list.page}
        count={services.length}
      />
    </div>
  );
}
function ServiceActions({ service: s }: { service: ServiceDto }) {
  const t = useTranslations("Luma");
  const benefits = useSportsQuery<ServiceDto[]>("business/sports/services", {
    organizationId: s.organizationId,
    branchId: s.branchId,
  });
  const publish = useSportsCommand(`business/sports/services/${s.id}/publish`);
  const update = useSportsCommand(
    `business/sports-operations/services/${s.id}/version`,
  );
  const schedule = useSportsCommand<OccurrenceSeriesDto>(
    `business/sports/services/${s.id}/occurrence-series`,
  );
  const scheduleKey = useRef<{
    fingerprint: string;
    value: string;
  } | null>(null);
  const [scheduleResult, setScheduleResult] = useState<number | null>(null);
  const [scheduleError, setScheduleError] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {s.sportName} · {t(`kinds.${s.kind}`)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-center flex-wrap">
          <Status value={s.status} />
          {s.status === "published" && s.hasUnpublishedChanges && (
            <span className="text-sm text-muted-foreground">
              {t("pendingPublication")}
            </span>
          )}
          <Button
            variant="outline"
            aria-expanded={editOpen}
            onClick={() => setEditOpen((v) => !v)}
          >
            {t("editService")}
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            aria-expanded={coverOpen}
            onClick={() => setCoverOpen((value) => !value)}
          >
            {t("serviceCover")}
          </Button>
          {!["membership", "program"].includes(s.kind) && (
            <Button
              variant="outline"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {t("chooseSession")}
            </Button>
          )}
          <Button
            variant="outline"
            aria-expanded={documentsOpen}
            onClick={() => setDocumentsOpen((v) => !v)}
          >
            {t("requiredDocuments")}
          </Button>
          <Button
            variant="outline"
            aria-expanded={couponsOpen}
            onClick={() => setCouponsOpen((v) => !v)}
          >
            {t("coupons")}
          </Button>
          {(s.status === "draft" || s.hasUnpublishedChanges) && (
            <Button
              disabled={publish.isPending}
              onClick={() => publish.mutate({ revision: s.revision })}
            >
              {t(s.status === "draft" ? "publish" : "publishChanges")}
            </Button>
          )}
        </div>
        {coverOpen && <ServiceCoverEditor service={s} />}
        {editOpen && (
          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const fields = new FormData(form);
              const price = tomanInputToRial(
                String(fields.get("price") ?? "0"),
              );
              if (price === null) return;
              update.mutate(
                {
                  revision: s.revision,
                  service: {
                    organizationId: s.organizationId,
                    branchId: s.branchId,
                    title: fields.get("title"),
                    description: fields.get("description"),
                    kind: s.kind,
                    sportId: fields.get("sportId") || null,
                    offering: readOffering(fields),
                    amountMinor: price,
                    currency: "IRR",
                    durationDays: s.durationDays,
                    sessionCount: s.sessionCount,
                    resourceIds: s.resourceIds ?? [],
                    requirements: s.requirements ?? [],
                    eligibility: readServiceEligibility(fields),
                    level: fields.get("level"),
                    coachName: fields.get("coach"),
                    coachUserId: s.coachUserId ?? null,
                    visibility: fields.get("visibility"),
                    approvalRequired: fields.has("approval"),
                    showParticipants: fields.has("participants"),
                    policy: {
                      ...s.policy,
                      cancellationHours: Number(fields.get("cutoff")),
                      lateRefundBasisPoints: Number(fields.get("refund")) * 100,
                      terms: fields.get("terms"),
                    },
                  },
                },
                { onSuccess: () => setEditOpen(false) },
              );
            }}
          >
            <BusinessFieldSteps>
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                {t("serviceEditHint")}
              </p>
              <FormField label={t("title")}>
                <Input
                  name="title"
                  defaultValue={s.title}
                  minLength={2}
                  maxLength={160}
                  required
                />
              </FormField>
              <FormField label={`${t("price")} (${t("toman")})`}>
                <Input
                  name="price"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1000000000000"
                  defaultValue={rialToTomanInput(s.amountMinor)}
                  required
                />
              </FormField>
              <FormField label={t("description")}>
                <Textarea
                  name="description"
                  defaultValue={s.description}
                  maxLength={10000}
                />
              </FormField>
              <FormField label={t("conditions")}>
                <Textarea
                  name="terms"
                  defaultValue={s.policy.terms}
                  minLength={10}
                  maxLength={10000}
                  required
                />
              </FormField>
              <FormField label={t("cancelHours")}>
                <Input
                  name="cutoff"
                  type="number"
                  min="0"
                  max="8760"
                  defaultValue={s.policy.cancellationHours}
                  required
                />
              </FormField>
              <FormField label={t("refundPercent")}>
                <Input
                  name="refund"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={s.policy.lateRefundBasisPoints / 100}
                  required
                />
              </FormField>
              <FormField label={t("level")}>
                <Input name="level" maxLength={80} defaultValue={s.level} />
              </FormField>
              <OfferingFields
                kind={s.kind}
                service={s}
                services={benefits.data ?? []}
              />
              <ServiceEligibilityFields value={s.eligibility} />
              <FormField label={t("coach")}>
                <Input
                  name="coach"
                  maxLength={120}
                  defaultValue={s.coachName}
                />
              </FormField>
              <FormField label={t("visibility")}>
                <NativeSelect
                  name="visibility"
                  defaultValue={s.visibility ?? "public"}
                >
                  <NativeSelectOption value="public">
                    {t("public")}
                  </NativeSelectOption>
                  <NativeSelectOption value="unlisted">
                    {t("unlisted")}
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2">
                  <input
                    name="approval"
                    type="checkbox"
                    defaultChecked={s.approvalRequired}
                  />
                  {t("approval")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="participants"
                    type="checkbox"
                    defaultChecked={s.showParticipants}
                  />
                  {t("participants")}
                </label>
              </div>
              <div className="sm:col-span-2">
                <QueryError error={update.error} />
                <Button type="submit" disabled={update.isPending}>
                  {t("save")}
                </Button>
              </div>
            </BusinessFieldSteps>
          </form>
        )}
        {open && (
          <form
            className="grid sm:grid-cols-3 gap-4 mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              setScheduleResult(null);
              setScheduleError("");
              schedule.reset();
              const form = e.currentTarget;
              const f = new FormData(form);
              const start = new Date(String(f.get("start")));
              const end = new Date(String(f.get("end")));
              if (end <= start) {
                setScheduleError(t("endAfterStart"));
                return;
              }
              const draft = {
                startAt: start.toISOString(),
                endAt: end.toISOString(),
                capacity: Number(f.get("capacity")),
                count: Number(f.get("count")),
                intervalDays: Number(f.get("interval")) as 1 | 7 | 14,
                revision: s.revision,
              };
              const fingerprint = JSON.stringify(draft);
              if (scheduleKey.current?.fingerprint !== fingerprint)
                scheduleKey.current = {
                  fingerprint,
                  value: crypto.randomUUID(),
                };
              const input: OccurrenceSeriesInput = {
                ...draft,
                idempotencyKey: scheduleKey.current.value,
              };
              schedule.mutate(input, {
                onSuccess: (result) => {
                  scheduleKey.current = null;
                  setScheduleResult(result.occurrences.length);
                  form.reset();
                },
              });
            }}
          >
            <BusinessFieldSteps>
              <p className="sm:col-span-3 text-sm text-muted-foreground">
                {t("scheduleSeriesHint")}
              </p>
              <FormField label={t("startAt")}>
                <IranianDateTimeInput name="start" required />
              </FormField>
              <FormField label={t("endAt")}>
                <IranianDateTimeInput name="end" required />
              </FormField>
              <FormField label={t("capacityTotal")}>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  name="capacity"
                  required
                />
              </FormField>
              <FormField label={t("repeatCount")}>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  name="count"
                  defaultValue="1"
                  required
                />
              </FormField>
              <FormField label={t("repeatInterval")}>
                <NativeSelect name="interval" defaultValue="7">
                  <NativeSelectOption value="1">
                    {t("daily")}
                  </NativeSelectOption>
                  <NativeSelectOption value="7">
                    {t("weekly")}
                  </NativeSelectOption>
                  <NativeSelectOption value="14">
                    {t("fortnightly")}
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              {scheduleError && (
                <p role="alert" className="sm:col-span-3 text-destructive">
                  {scheduleError}
                </p>
              )}
              <Button type="submit" disabled={schedule.isPending}>
                {t("save")}
              </Button>
            </BusinessFieldSteps>
          </form>
        )}
        <SuccessNotice
          success={scheduleResult !== null}
          message={t("seriesScheduled", { count: scheduleResult ?? 0 })}
        />
        {open && (
          <>
            <OccurrenceSeriesManager serviceId={s.id} />
            <SessionManager serviceId={s.id} />
          </>
        )}
        <QueryError error={publish.error ?? schedule.error} />
        {documentsOpen && <DocumentReviewQueue serviceId={s.id} />}
        {couponsOpen && <CouponManager serviceId={s.id} />}
      </CardContent>
    </Card>
  );
}
function CouponManager({ serviceId }: { serviceId: string }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const query = useSportsQuery<CouponDto[]>(
    `business/sports/services/${serviceId}/coupons`,
  );
  const create = useSportsCommand(
    `business/sports/services/${serviceId}/coupons`,
  );
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="font-semibold mb-4">{t("coupons")}</h3>
      <form
        className="grid gap-3 sm:grid-cols-4 items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fields = new FormData(form);
          create.mutate(
            {
              code: String(fields.get("code") ?? "")
                .trim()
                .toUpperCase(),
              basisPoints: Number(fields.get("percent")) * 100,
              maxUses: Number(fields.get("maxUses")),
              expiresAt: new Date(
                String(fields.get("expiresAt")),
              ).toISOString(),
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <BusinessFieldSteps>
          <FormField label={t("coupon")}>
            <Input
              name="code"
              minLength={3}
              maxLength={60}
              pattern="[A-Za-z0-9_-]{3,60}"
              autoCapitalize="characters"
              required
            />
          </FormField>
          <FormField label={t("couponPercent")}>
            <Input name="percent" type="number" min="1" max="100" required />
          </FormField>
          <FormField label={t("couponMaxUses")}>
            <Input name="maxUses" type="number" min="1" max="100000" required />
          </FormField>
          <FormField label={t("expires")}>
            <IranianDateTimeInput name="expiresAt" required />
          </FormField>
          <Button type="submit" disabled={create.isPending}>
            {t("createCoupon")}
          </Button>
        </BusinessFieldSteps>
      </form>
      <QueryError
        error={create.error ?? query.error}
        retry={() => query.refetch()}
      />
      {query.isPending && <Loading />}
      {query.isSuccess && !query.data?.length && <Blank>{t("empty")}</Blank>}
      <div className="mt-4 grid gap-2">
        {query.data?.map((coupon) => (
          <CouponRow
            key={coupon.id}
            serviceId={serviceId}
            coupon={coupon}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
function CouponRow({
  serviceId,
  coupon,
  locale,
}: {
  serviceId: string;
  coupon: CouponDto;
  locale: string;
}) {
  const t = useTranslations("Luma");
  const disable = useSportsCommand(
    `business/sports/services/${serviceId}/coupons/${coupon.id}/disable`,
  );
  const inactive = Boolean(
    coupon.disabledAt || new Date(coupon.expiresAt).getTime() <= Date.now(),
  );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
      <strong dir="ltr">{coupon.code}</strong>
      <span>
        {t("couponPercentValue", { percent: coupon.basisPoints / 100 })}
      </span>
      <span className="text-sm text-muted-foreground">
        {t("couponUsage", { used: coupon.used, max: coupon.maxUses })}
      </span>
      <span className="text-sm text-muted-foreground">
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(coupon.expiresAt))}
      </span>
      {inactive ? (
        <span className="text-sm text-muted-foreground">
          {t("couponInactive")}
        </span>
      ) : (
        <Button
          variant="outline"
          disabled={disable.isPending}
          onClick={() => disable.mutate({ revision: coupon.revision })}
        >
          {t("disableCoupon")}
        </Button>
      )}
      <QueryError error={disable.error} />
    </div>
  );
}
function DocumentReviewQueue({ serviceId }: { serviceId: string }) {
  const t = useTranslations("Luma");
  const query = useSportsQuery<DocumentReviewDto[]>(
    `business/sports/services/${serviceId}/documents`,
  );
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="font-semibold mb-3">{t("requiredDocuments")}</h3>
      {query.isPending && <Loading />}
      {query.isSuccess && !query.data?.length && <Blank>{t("empty")}</Blank>}
      {query.data?.map((document) => (
        <DocumentReview key={document.id} document={document} />
      ))}
      <QueryError error={query.error} retry={() => query.refetch()} />
    </section>
  );
}
function DocumentReview({ document }: { document: DocumentReviewDto }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const expired = Boolean(
    document.expiresAt && new Date(document.expiresAt).getTime() <= Date.now(),
  );
  const [inspect, setInspect] = useState(false);
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  const preview = useSportsQuery<{ url: string }>(
    `sports/documents/${document.id}/preview`,
    undefined,
    inspect,
  );
  const decision = useSportsCommand(
    `business/sports/documents/${document.id}/review`,
  );
  const submit = (approve: boolean) =>
    decision.mutate(
      { revision: document.revision, approve, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason("");
          setOpened(false);
        },
      },
    );
  return (
    <div className="border-b border-border py-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <strong>{document.name}</strong>
        <span className="text-sm text-muted-foreground">
          {document.displayName ?? "—"}
        </span>
        <Status value={expired ? "expired" : document.status} />
        {document.expiresAt && (
          <span className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              new Date(document.expiresAt),
            )}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          disabled={inspect && preview.isFetching}
          onClick={() => {
            setOpened(false);
            if (inspect) void preview.refetch();
            else setInspect(true);
          }}
        >
          {t("viewDocument")}
        </Button>
        {preview.data?.url && !preview.isFetching && (
          <a
            href={preview.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
            onClick={() => setOpened(true)}
          >
            {t("openDocument")}
          </a>
        )}
      </div>
      <QueryError error={preview.error} retry={() => preview.refetch()} />
      {document.status === "pending" && (
        <>
          <FormField label={t("reason")}>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={1000}
            />
          </FormField>
          <p className="text-sm text-muted-foreground">
            {t("documentReviewHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                expired ||
                !opened ||
                reason.trim().length < 3 ||
                decision.isPending
              }
              onClick={() => submit(true)}
            >
              {t("approveDocument")}
            </Button>
            <Button
              variant="outline"
              disabled={
                !opened || reason.trim().length < 3 || decision.isPending
              }
              onClick={() => submit(false)}
            >
              {t("rejectDocument")}
            </Button>
          </div>
        </>
      )}
      <QueryError error={decision.error} />
    </div>
  );
}
function Calendar({
  services,
  org,
  branch,
}: {
  services: ServiceDto[];
  org: string;
  branch: string;
}) {
  const calendar = useSportsQuery<HostCalendarDto>(
    "sports/community/host/calendar",
    { organizationId: org, branchId: branch },
  );
  return (
    <div className="grid gap-4">
      {services
        .filter((s) => !["membership", "program"].includes(s.kind))
        .map((s) => (
          <OccurrenceList
            key={s.id}
            service={s}
            canManage={calendar.data?.canManage === true}
          />
        ))}
    </div>
  );
}
function OccurrenceList({
  service: s,
  canManage,
}: {
  service: ServiceDto;
  canManage: boolean;
}) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const query = useSportsQuery<
    {
      id: string;
      revision: number;
      startAt: string;
      capacity: number;
      status: string;
    }[]
  >(`business/sports-operations/services/${s.id}/occurrences`);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{s.title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.data?.map((o) => (
          <OccurrenceActions
            key={o.id}
            item={o}
            title={s.title}
            locale={locale}
            canManage={canManage}
          />
        ))}
        <QueryError error={query.error} />
        {query.isSuccess && !query.data?.length && <Blank>{t("empty")}</Blank>}
      </CardContent>
    </Card>
  );
}
function OccurrenceActions({
  item: o,
  title,
  locale,
  canManage,
}: {
  item: {
    id: string;
    revision: number;
    startAt: string;
    capacity: number;
    status: string;
  };
  title: string;
  locale: string;
  canManage: boolean;
}) {
  const t = useTranslations("Luma");
  const router = useRouter();
  const command = useSportsCommand(
    `business/sports-operations/occurrences/${o.id}/cancel`,
  );
  const chat = useSportsCommand<{ id: string }>(
    "sports/community/host/conversations",
  );
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState<{
    revision: number;
    reason: string;
  } | null>(null);
  return (
    <div className="py-4 border-b border-border">
      <p>
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Tehran",
        }).format(new Date(o.startAt))}{" "}
        · {t("capacityTotal")}: {o.capacity}
      </p>
      {canManage && o.status === "scheduled" && (
        <div className="flex flex-wrap gap-3 mt-3">
          <Input
            className="min-h-11"
            aria-label={t("reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={reason.trim().length < 3 || command.isPending}
            onClick={() =>
              setConfirmation({ revision: o.revision, reason: reason.trim() })
            }
          >
            {t("cancel")}
          </Button>
          <Button
            disabled={chat.isPending}
            onClick={() =>
              chat.mutate(
                { occurrenceId: o.id },
                {
                  onSuccess: (conversation) =>
                    router.push(`/messages/${conversation.id}`),
                },
              )
            }
          >
            {t("messages")} · {title}
          </Button>
        </div>
      )}
      <BottomSheet
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !command.isPending) setConfirmation(null);
        }}
        title={t("confirmCancel")}
        description={t("occurrenceCancelHint")}
      >
        <p className="mb-3 font-semibold">{title}</p>
        <p className="mb-5 text-sm">{confirmation?.reason}</p>
        <ConfirmAction
          label={t("confirmCancel")}
          disabled={command.isPending}
          onConfirm={() => {
            if (confirmation && !command.isPending)
              command.mutate(confirmation, {
                onSuccess: () => setConfirmation(null),
              });
          }}
        />
        <QueryError error={command.error} />
      </BottomSheet>
      <QueryError error={command.error ?? chat.error} />
      <SuccessNotice
        success={chat.isSuccess}
        message={t("conversationAvailable")}
      />
    </div>
  );
}
export function SportsAdmin() {
  const t = useTranslations("Luma");
  const list = useManagementFilters("admin-operations");
  const query = useSportsQuery<{
    refunds: {
      id: string;
      orderId: string;
      state: string;
      amountMinor: string;
      reason: string;
    }[];
    orders: { id: string; status: string; amountMinor: string }[];
    payments: { id: string; orderId: string; state: string }[];
    jobs: { id: string; kind: string; attempts: number }[];
    tickets: TicketDto[];
    reports: {
      id: string;
      messageId: string;
      reason: string;
      body: string;
      revision: number;
    }[];
  }>("admin/sports", list.filters, true, true);
  return (
    <main className="gym-workspace min-h-dvh bg-muted/40 p-5 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold">{t("operations")}</h1>
          <Link href="/">{t("home")}</Link>
        </header>
        <ManagementFilterBar value={list.filters} onApply={list.apply} />
        <QueryError error={query.error} />
        {query.isPending && <Loading />}
        {query.data && (
          <div className="grid gap-6">
            <AdminSchedulePanel />
            <Card>
              <CardHeader>
                <CardTitle>{t("refunds")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {query.data.refunds?.map((r) => (
                  <div key={r.id}>
                    <p className="text-sm">{r.reason}</p>
                    <ReconcileRow id={r.orderId} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("reconciliation")}</CardTitle>
              </CardHeader>
              <CardContent>
                {query.data.payments.map((p) => (
                  <ReconcileRow key={p.id} id={p.orderId} />
                ))}
                {query.data.orders.map((o) => (
                  <ReconcileRow key={o.id} id={o.id} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("jobs")}</CardTitle>
              </CardHeader>
              <CardContent>
                {query.data.jobs.map((j) => (
                  <JobRow
                    key={j.id}
                    id={j.id}
                    title={j.kind}
                    attempts={j.attempts}
                  />
                ))}
              </CardContent>
            </Card>
            {query.data.tickets.map((ticket) => (
              <AdminTicket key={ticket.id} ticket={ticket} />
            ))}
            <Card>
              <CardHeader>
                <CardTitle>{t("reportMessage")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {query.data.reports.map((r) => (
                  <MessageReportActions key={r.id} report={r} />
                ))}
              </CardContent>
            </Card>
            <Pager
              page={list.filters.page}
              setPage={list.page}
              count={Math.max(
                ...[
                  query.data.orders,
                  query.data.payments,
                  query.data.refunds ?? [],
                  query.data.jobs,
                  query.data.tickets,
                  query.data.reports,
                ].map((rows) => rows.length),
              )}
            />
          </div>
        )}
      </div>
    </main>
  );
}
function MessageReportActions({
  report,
}: {
  report: {
    id: string;
    messageId: string;
    reason: string;
    body: string;
    revision: number;
  };
}) {
  const t = useTranslations("Luma");
  const [reason, setReason] = useState("");
  const command = useSportsCommand(
    `admin/sports/message-reports/${report.id}/decision`,
  );
  return (
    <div className="rounded-xl border border-border p-4 grid gap-3">
      <p className="font-semibold">{report.reason}</p>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
        {report.body}
      </p>
      <FormField label={t("reason")}>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={1000}
        />
      </FormField>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={reason.trim().length < 3 || command.isPending}
          onClick={() =>
            command.mutate({
              revision: report.revision,
              remove: false,
              reason: reason.trim(),
            })
          }
        >
          {t("dismissReport")}
        </Button>
        <Button
          variant="destructive"
          disabled={reason.trim().length < 3 || command.isPending}
          onClick={() =>
            command.mutate({
              revision: report.revision,
              remove: true,
              reason: reason.trim(),
            })
          }
        >
          {t("removeMessage")}
        </Button>
      </div>
      <QueryError error={command.error} />
    </div>
  );
}
function ReconcileRow({ id }: { id: string }) {
  const t = useTranslations("Luma");
  const command = useSportsCommand(`admin/sports/orders/${id}/reconcile`);
  return (
    <div className="flex flex-wrap gap-4 py-3">
      <span dir="ltr" className="text-xs">
        {id}
      </span>
      <Button disabled={command.isPending} onClick={() => command.mutate({})}>
        {t("verify")}
      </Button>
      <QueryError error={command.error} />
    </div>
  );
}
function JobRow({
  id,
  title,
  attempts,
}: {
  id: string;
  title: string;
  attempts: number;
}) {
  const t = useTranslations("Luma");
  const command = useSportsCommand(`admin/sports/jobs/${id}/retry`);
  return (
    <div className="flex gap-4 py-3">
      <span>
        {title} · {attempts}
      </span>
      <Button disabled={command.isPending} onClick={() => command.mutate({})}>
        {t("retry")}
      </Button>
      <QueryError error={command.error} />
    </div>
  );
}
function AdminTicket({ ticket }: { ticket: TicketDto }) {
  const t = useTranslations("Luma");
  const query = useSportsQuery<TicketDto>(`admin/sports/support/${ticket.id}`);
  const command = useSportsCommand(`admin/sports/support/${ticket.id}/reply`);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ticket.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.data?.messages.map((m) => (
          <p className="py-2" key={m.id}>
            {m.body}
          </p>
        ))}
        <form
          className="grid gap-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            command.mutate({ body: f.get("body"), resolve: f.has("resolve") });
          }}
        >
          <BusinessFieldSteps>
            <Textarea
              name="body"
              required
              maxLength={5000}
              aria-label={t("message")}
            />
            <label className="flex gap-2">
              <input type="checkbox" name="resolve" />
              {t("resolve")}
            </label>
            <Button disabled={command.isPending}>{t("send")}</Button>
            <QueryError error={query.error ?? command.error} />
          </BusinessFieldSteps>
        </form>
      </CardContent>
    </Card>
  );
}
