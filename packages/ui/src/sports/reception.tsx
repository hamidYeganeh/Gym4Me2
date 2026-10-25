"use client";
import { useState } from "react";
import { BottomSheet } from "../kit/BottomSheet";
import { UserRound } from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type BookingDto,
  type VisitDto,
} from "@repo/api/sports";
import {
  ManagementFilterBar,
  useManagementFilters,
} from "./management-filters";
import { Pager } from "../account/admin";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";
import { Status, FormField } from "./shared";
import { CustomerEntry, ReceptionSale } from "./reception-workflows";
import { TicketScanner } from "./ticket-scanner";
export function Reception({ org, branch }: { org: string; branch: string }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const list = useManagementFilters("reception", `${org}:${branch}`);
  const query = useSportsQuery<
    (BookingDto & { displayName: string; paymentStatus: string })[]
  >(
    "business/sports/reception",
    { organizationId: org, branchId: branch, ...list.filters },
    true,
    true,
  );
  const check = useSportsCommand("business/sports/check-in");
  const [token, setToken] = useState("");
  const visits = useSportsQuery<VisitDto[]>(
    "business/sports/visits",
    { organizationId: org, branchId: branch },
    true,
    true,
  );
  return (
    <div className="grid gap-6">
      <ReceptionSale org={org} branch={branch} />
      <CustomerEntry org={org} branch={branch} />
      <ManagementFilterBar
        value={list.filters}
        onApply={list.apply}
        statuses={[
          "held",
          "pending_approval",
          "confirmed",
          "cancelled",
          "expired",
          "completed",
          "no_show",
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("checkIn")}</CardTitle>
          <TicketScanner
            onRead={(value) => {
              setToken(value);
              check.mutate({ token: value });
            }}
          />
        </CardHeader>
        <CardContent>
          <form
            className="grid sm:grid-cols-3 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              check.mutate({ token: f.get("token") });
            }}
          >
            <FormField label={t("manualCode")}>
              <Input
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                maxLength={8192}
                required
                dir="ltr"
              />
            </FormField>

            <Button className="self-end" disabled={check.isPending}>
              {t("checkIn")}
            </Button>
          </form>
          <QueryError error={check.error} />
          {check.isSuccess && <p className="mt-3">{t("created")}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("recentVisits")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <QueryError error={visits.error} />
          {visits.data?.length === 0 && <p>{t("empty")}</p>}
          {visits.data?.map((visit) => (
            <VisitActions key={visit.id} visit={visit} locale={locale} />
          ))}
        </CardContent>
      </Card>
      {query.isPending && <Loading />}
      <QueryError error={query.error} />
      {query.data?.map((r) => (
        <ReservationActions key={r.id} item={r} org={org} branch={branch} />
      ))}
      <Pager
        page={list.filters.page}
        setPage={list.page}
        count={query.data?.length ?? 0}
      />
    </div>
  );
}
function VisitActions({ visit, locale }: { visit: VisitDto; locale: string }) {
  const t = useTranslations("Luma");
  const exit = useSportsCommand(`business/sports/visits/${visit.id}/exit`);
  const [reason, setReason] = useState("");
  return (
    <div className="rounded-xl border border-border p-4 grid gap-2">
      <p className="font-medium">{visit.displayName}</p>
      <p className="text-sm text-muted-foreground">
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Tehran",
        }).format(new Date(visit.createdAt))}
      </p>
      {visit.exitedAt ? (
        <p>{t("exited")}</p>
      ) : (
        <div className="flex flex-wrap gap-2 items-end">
          <FormField label={t("reason")}>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={2}
              maxLength={500}
            />
          </FormField>
          <Button
            variant="outline"
            disabled={reason.trim().length < 2 || exit.isPending}
            onClick={() => exit.mutate({ reason: reason.trim() })}
          >
            {t("recordExit")}
          </Button>
        </div>
      )}
      <QueryError error={exit.error} />
    </div>
  );
}
function ReservationActions({
  item: r,
  org,
  branch,
}: {
  item: BookingDto & { displayName: string; paymentStatus: string };
  org: string;
  branch: string;
}) {
  const t = useTranslations("Luma");
  const attendance = useSportsCommand(
    `business/sports-operations/reservations/${r.id}/attendance`,
  );
  const approval = useSportsCommand(
    `business/sports-operations/reservations/${r.id}/approval`,
  );
  const entry = useSportsCommand("business/sports-workflows/entry");
  const w = useTranslations("Workflow");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <article className="host-guest-row">
      <span className="host-guest-avatar" aria-hidden="true">
        <UserRound size={23} />
      </span>
      <div className="host-guest-copy">
        <strong>{r.displayName}</strong>
        <span>{r.title}</span>
        <Status value={r.status} />
      </div>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {t(r.status === "pending_approval" ? "preview" : "checkIn")}
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={r.displayName}
        description={r.title}
      >
        <div className="grid gap-4">
          {["confirmed", "completed"].includes(r.status) && (
            <>
              <Button
                disabled={entry.isPending}
                onClick={() =>
                  entry.mutate({
                    organizationId: org,
                    branchId: branch,
                    reservationId: r.id,
                    idempotencyKey: crypto.randomUUID(),
                  })
                }
              >
                {w("recordEntry")}
              </Button>
              <QueryError error={entry.error} />
              {entry.isSuccess && <p role="status">{w("entryRecorded")}</p>}
            </>
          )}
          <div className="flex gap-3 mb-4">
            <Status value={r.status} />
            <Status value={r.paymentStatus} />
          </div>
          <FormField label={t("reason")}>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={3}
              maxLength={1000}
            />
          </FormField>
          <div className="flex flex-wrap gap-3 mt-4">
            {r.status === "pending_approval" ? (
              <>
                <Button
                  disabled={reason.length < 3 || approval.isPending}
                  onClick={() =>
                    approval.mutate({
                      revision: r.revision,
                      approve: true,
                      reason,
                    })
                  }
                >
                  {t("accept")}
                </Button>
                <Button
                  variant="outline"
                  disabled={reason.length < 3 || approval.isPending}
                  onClick={() =>
                    approval.mutate({
                      revision: r.revision,
                      approve: false,
                      reason,
                    })
                  }
                >
                  {t("decline")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={reason.length < 3 || attendance.isPending}
                  onClick={() =>
                    attendance.mutate(
                      { present: true, reason },
                      { onSuccess: () => setOpen(false) },
                    )
                  }
                >
                  {t("present")}
                </Button>
                <Button
                  variant="outline"
                  disabled={reason.length < 3 || attendance.isPending}
                  onClick={() =>
                    attendance.mutate(
                      { present: false, reason },
                      { onSuccess: () => setOpen(false) },
                    )
                  }
                >
                  {t("absent")}
                </Button>
              </>
            )}
          </div>
          <QueryError error={attendance.error ?? approval.error} />
        </div>
      </BottomSheet>
    </article>
  );
}
