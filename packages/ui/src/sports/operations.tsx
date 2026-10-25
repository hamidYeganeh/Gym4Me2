"use client";
import { useOrganizations } from "@repo/api/business";
import { MemberBenefits } from "./member-benefits";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
  type OrderDto,
} from "@repo/api/sports";
import {
  ManagementFilterBar,
  useManagementFilters,
} from "./management-filters";
import { Pager } from "../account/admin";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { ReceiptForm, ReceiptQueue } from "./payment-receipts";
import { TuitionPlan } from "./tuition-plan";
import { LegacyReadiness } from "./legacy-readiness";
import { RefundReview } from "./refund-review";
import { Status, Blank, FormField } from "./shared";
import { QueryError } from "./query-error";
export function Members({ org, branch }: { org: string; branch: string }) {
  const t = useTranslations("Luma");
  const organizations = useOrganizations();
  const canEdit = ["owner", "manager"].includes(
    organizations.data?.find((o) => o.id === org)?.role ?? "",
  );
  const list = useManagementFilters("members", `${org}:${branch}`);
  const query = useSportsQuery<
    {
      id: string;
      displayName: string;
      phone: string;
      title: string;
      revision: number;
      includedServiceIds: string[];
      entryAllowed: boolean;
      granted: number | null;
      consumed: number;
      status: string;
    }[]
  >("business/sports-operations/members", {
    organizationId: org,
    branchId: branch,
    ...list.filters,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("members")}</CardTitle>
      </CardHeader>
      <CardContent>
        <LegacyReadiness org={org} branch={branch} />
        <ManagementFilterBar
          value={list.filters}
          onApply={list.apply}
          statuses={["pending", "active", "frozen", "expired", "cancelled"]}
        />
        {query.data?.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap justify-between gap-3 py-4 border-b border-border"
          >
            <span>
              {m.displayName} · {m.title}
            </span>
            <span dir="ltr">{m.phone}</span>
            <span>
              {t("remaining")}:{" "}
              {m.granted === null ? "∞" : m.granted - m.consumed}
            </span>
            <Status value={m.status} />
            {canEdit && (
              <MemberBenefits
                key={`${m.id}:${m.revision}`}
                id={m.id}
                revision={m.revision}
                serviceIds={m.includedServiceIds ?? []}
                entryAllowed={m.entryAllowed}
                org={org}
                branch={branch}
              />
            )}
          </div>
        ))}
        <Pager
          page={list.filters.page}
          setPage={list.page}
          count={query.data?.length ?? 0}
        />
        <QueryError error={query.error} />
        {query.isSuccess && !query.data?.length && <Blank>{t("empty")}</Blank>}
      </CardContent>
    </Card>
  );
}
export function Payments({ org, branch }: { org: string; branch: string }) {
  const list = useManagementFilters("payments", `${org}:${branch}`);
  const query = useSportsQuery<OrderDto[]>(
    "business/sports-operations/orders",
    { organizationId: org, branchId: branch, ...list.filters },
  );
  return (
    <div className="grid gap-4">
      <ManagementFilterBar
        value={list.filters}
        onApply={list.apply}
        statuses={[
          "awaiting_payment",
          "partially_paid",
          "paid",
          "partially_refunded",
          "refunded",
          "cancelled",
          "review",
        ]}
      />
      <ReceiptQueue org={org} branch={branch} />
      <RefundReview org={org} branch={branch} />
      <QueryError error={query.error} />
      {query.data?.map((o) => (
        <CashOrder key={o.id} order={o} org={org} />
      ))}
      <Pager
        page={list.filters.page}
        setPage={list.page}
        count={query.data?.length ?? 0}
      />
    </div>
  );
}
function CashOrder({ order: o, org }: { order: OrderDto; org: string }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const command = useSportsCommand(
    `business/sports-operations/orders/${o.id}/cash`,
  );
  const [reason, setReason] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{o.snapshot.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center">
          <Status value={o.status} />
          <span>
            {new Intl.NumberFormat(locale).format(
              BigInt(o.amountMinor) / BigInt(10),
            )}{" "}
            {t("toman")}
          </span>
        </div>
        {o.snapshot.kind === "membership" && (
          <TuitionPlan
            orderId={o.id}
            business
            organizationId={org}
            amountMinor={o.amountMinor}
            status={o.status}
          />
        )}
        {["awaiting_payment", "partially_paid"].includes(o.status) && (
          <ReceiptForm orderId={o.id} business />
        )}
        {o.status === "awaiting_payment" && (
          <>
            <FormField label={t("reason")}>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
            <Button
              className="mt-4"
              disabled={reason.length < 3 || command.isPending}
              onClick={() => command.mutate({ reason })}
            >
              {t("cashReceived")}
            </Button>
            <QueryError error={command.error} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function Reports({ org, branch }: { org: string; branch: string }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const query = useSportsQuery<{
    salesMinor: string;
    collectedMinor: string;
    attendanceCount: number;
  }>("business/sports/report", { organizationId: org, branchId: branch });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("report")}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryError error={query.error} />
        {query.data && (
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              ["salesMinor", t("sales")],
              ["collectedMinor", t("collected")],
            ].map(([key, label]) => (
              <div key={key}>
                <p>{label}</p>
                <strong className="text-2xl">
                  {new Intl.NumberFormat(locale).format(
                    BigInt(
                      query.data![key as "salesMinor" | "collectedMinor"],
                    ) / BigInt(10),
                  )}{" "}
                  {t("toman")}
                </strong>
              </div>
            ))}
            <div>
              <p>{t("attendance")}</p>
              <strong className="text-2xl">{query.data.attendanceCount}</strong>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function Imports({ services }: { services: ServiceDto[] }) {
  const t = useTranslations("Luma");
  const [service, setService] = useState("");
  const [csv, setCsv] = useState("");
  const key = useRef<string | null>(null);
  const preview = useSportsCommand<
    {
      line: number;
      name: string;
      phone: string;
      remaining: number;
      errors: string[];
    }[]
  >("business/sports-operations/imports/preview");
  const apply = useSportsCommand("business/sports-operations/imports/apply");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("imports")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FormField label={t("memberships")}>
          <NativeSelect
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              key.current = null;
              preview.reset();
            }}
          >
            <NativeSelectOption value="">
              {t("chooseSession")}
            </NativeSelectOption>
            {services
              .filter((s) => s.kind === "membership")
              .map((s) => (
                <NativeSelectOption value={s.id} key={s.id}>
                  {s.title}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        </FormField>
        <p className="text-sm text-muted-foreground">{t("importFormat")}</p>
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size <= 100000)
              void file.text().then((value) => {
                setCsv(value);
                key.current = null;
                preview.reset();
              });
          }}
        />
        <Textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            key.current = null;
            preview.reset();
          }}
          rows={6}
        />
        <Button
          disabled={!service || !csv || preview.isPending}
          onClick={() => preview.mutate({ serviceId: service, csv })}
        >
          {t("preview")}
        </Button>
        {preview.data?.map((r) => (
          <p key={r.line} className={r.errors.length ? "text-destructive" : ""}>
            {r.line}: {r.name} · {r.remaining} {r.errors.join(" · ")}
          </p>
        ))}
        {Boolean(preview.data?.length) &&
          !preview.data?.some((r) => r.errors.length) && (
            <Button
              disabled={apply.isPending}
              onClick={() => {
                key.current ??= crypto.randomUUID();
                apply.mutate({
                  serviceId: service,
                  csv,
                  idempotencyKey: key.current,
                });
              }}
            >
              {t("importApply")}
            </Button>
          )}
        <QueryError error={preview.error ?? apply.error} />
        {apply.isSuccess && <p>{t("created")}</p>}
      </CardContent>
    </Card>
  );
}
