"use client";
import { IranianDateTimeInput } from "../kit/IranianDateInput";
import { ClassRoster } from "./class-roster";
import {
  useManagementFilters,
  ManagementFilterBar,
} from "./management-filters";
import { Pager } from "../account/admin";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardHeader, CardTitle, CardContent } from "../kit/Card";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";
import { BottomSheet } from "../kit/BottomSheet";
import { ConfirmAction } from "../confirm-action";

type Session = {
  id: string;
  revision: number;
  startAt: string;
  endAt: string;
  capacity: number;
  status: string;
  reserved?: number;
};
type ScheduleService = {
  id: string;
  title: string;
  revision: number;
  organizationName: string;
  branchName: string;
};
const localTime = (value: string) => {
  const date = new Date(value),
    pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
export function SessionEditor({
  item,
  administrator = false,
  onSaved,
}: {
  item: Session;
  administrator?: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations("Luma"),
    key = useRef<{ fingerprint: string; value: string } | null>(null);
  const command = useSportsCommand(
    `${administrator ? "admin/sports" : "business/sports-operations"}/occurrences/${item.id}/edit`,
  );
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="grid gap-3 mt-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (command.isPending) return;
        const form = new FormData(event.currentTarget),
          start = new Date(String(form.get("start"))),
          end = new Date(String(form.get("end")));
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime()) ||
          end <= start
        ) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        const draft = {
          startAt:
            String(form.get("start")) === localTime(item.startAt)
              ? item.startAt
              : start.toISOString(),
          endAt:
            String(form.get("end")) === localTime(item.endAt)
              ? item.endAt
              : end.toISOString(),
          capacity: Number(form.get("capacity")),
          revision: item.revision,
          reason: String(form.get("reason")).trim(),
        };
        const fingerprint = JSON.stringify(draft);
        if (key.current?.fingerprint !== fingerprint)
          key.current = { fingerprint, value: crypto.randomUUID() };
        command.mutate(
          { ...draft, idempotencyKey: key.current.value },
          {
            onSuccess: () => {
              key.current = null;
              onSaved();
            },
          },
        );
      }}
    >
      <p className="text-sm text-muted-foreground sm:col-span-2">
        {t("sessionEditHint")}
      </p>
      <label>
        {t("startAt")}
        <IranianDateTimeInput
          name="start"

          defaultValue={localTime(item.startAt)}
          required
          disabled={command.isPending}
        />
      </label>
      <label>
        {t("endAt")}
        <IranianDateTimeInput
          name="end"

          defaultValue={localTime(item.endAt)}
          required
          disabled={command.isPending}
        />
      </label>
      <label>
        {t("capacityTotal")}
        <Input
          name="capacity"
          type="number"
          min={Math.max(1, item.reserved ?? 0)}
          max="10000"
          defaultValue={item.capacity}
          required
          disabled={command.isPending}
        />
      </label>
      <label>
        {t("reason")}
        <Input
          name="reason"
          minLength={5}
          maxLength={500}
          required
          disabled={command.isPending}
        />
      </label>
      {invalid && <p role="alert">{t("endAfterStart")}</p>}
      <QueryError error={command.error} />
      <Button type="submit" disabled={command.isPending}>
        {t("save")}
      </Button>
    </form>
  );
}
export function SessionManager({
  serviceId,
  administrator = false,
}: {
  serviceId: string;
  administrator?: boolean;
}) {
  const t = useTranslations("Luma"),
    locale = useLocale();
  const query = useSportsQuery<Session[]>(
    `${administrator ? "admin/sports" : "business/sports-operations"}/services/${serviceId}/occurrences`,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const cancel = useSportsCommand(
    `admin/sports/occurrences/${selected ?? ""}/cancel`,
  );
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState<{
    revision: number;
    reason: string;
    startAt: string;
  } | null>(null);
  if (query.isPending) return <Loading />;
  return (
    <section className="mt-5 grid gap-4" aria-label={t("manageSessions")}>
      <h3 className="font-semibold">{t("manageSessions")}</h3>
      <QueryError error={query.error} retry={() => query.refetch()} />
      {query.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {query.data?.map((item) => (
        <div key={item.id} className="rounded-xl border border-border p-4">
          {!administrator && <ClassRoster occurrenceId={item.id} business />}
          <p>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(item.startAt))}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("capacityTotal")}:{" "}
            {new Intl.NumberFormat(locale).format(item.capacity)}
          </p>
          {item.status === "scheduled" &&
            Date.parse(item.startAt) > Date.now() && (
              <Button
                className="mt-3"
                variant="outline"
                aria-expanded={selected === item.id}
                onClick={() => {
                  setSelected(selected === item.id ? null : item.id);
                  setReason("");
                }}
              >
                {t("editSession")}
              </Button>
            )}
          {selected === item.id && (
            <>
              <SessionEditor
                item={item}
                administrator={administrator}
                onSaved={() => setSelected(null)}
              />
              {administrator && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Input
                    aria-label={t("reason")}
                    placeholder={t("reason")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={reason.trim().length < 5 || cancel.isPending}
                    onClick={() =>
                      setConfirmation({
                        revision: item.revision,
                        reason: reason.trim(),
                        startAt: item.startAt,
                      })
                    }
                  >
                    {t("cancel")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      <BottomSheet
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !cancel.isPending) setConfirmation(null);
        }}
        title={t("confirmCancel")}
        description={t("occurrenceCancelHint")}
      >
        {confirmation && (
          <p className="mb-3 font-semibold">
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Tehran",
            }).format(new Date(confirmation.startAt))}
          </p>
        )}
        <p className="mb-5 text-sm">{confirmation?.reason}</p>
        <ConfirmAction
          label={t("confirmCancel")}
          disabled={cancel.isPending}
          onConfirm={() => {
            if (confirmation && !cancel.isPending)
              cancel.mutate(
                {
                  revision: confirmation.revision,
                  reason: confirmation.reason,
                },
                {
                  onSuccess: () => {
                    setConfirmation(null);
                    setSelected(null);
                  },
                },
              );
          }}
        />
        <QueryError error={cancel.error} />
      </BottomSheet>
      <QueryError error={cancel.error} />
    </section>
  );
}
export function AdminSchedulePanel() {
  const t = useTranslations("Luma");
  const list = useManagementFilters("admin-schedule");
  const query = useSportsQuery<ScheduleService[]>(
    "admin/sports/scheduling",
    list.filters,
  );
  const [serviceId, setServiceId] = useState("");
  const service = query.data?.find((x) => x.id === serviceId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageSessions")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ManagementFilterBar
          value={list.filters}
          onApply={list.apply}
          statuses={["draft", "published", "archived"]}
          kinds
        />
        <Pager
          page={list.filters.page}
          setPage={list.page}
          count={query.data?.length ?? 0}
        />
        <QueryError error={query.error} retry={() => query.refetch()} />
        <NativeSelect
          aria-label={t("chooseSession")}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <NativeSelectOption value="">{t("chooseSession")}</NativeSelectOption>
          {query.data?.map((x) => (
            <NativeSelectOption key={x.id} value={x.id}>
              {x.organizationName} · {x.branchName} · {x.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {service && (
          <>
            <AdminSessionCreate key={service.id} service={service} />
            <SessionManager serviceId={service.id} administrator />
          </>
        )}
      </CardContent>
    </Card>
  );
}
function AdminSessionCreate({ service }: { service: ScheduleService }) {
  const t = useTranslations("Luma"),
    command = useSportsCommand(
      `admin/sports/services/${service.id}/occurrence-series`,
    ),
    key = useRef<{ fingerprint: string; value: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <details className="mt-4">
      <summary className="cursor-pointer min-h-11">
        {t("createSession")}
      </summary>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (command.isPending) return;
          const form = new FormData(e.currentTarget),
            start = new Date(String(form.get("start"))),
            end = new Date(String(form.get("end")));
          if (
            !Number.isFinite(start.getTime()) ||
            !Number.isFinite(end.getTime()) ||
            end <= start
          ) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          const draft = {
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            capacity: Number(form.get("capacity")),
            count: Number(form.get("count")),
            intervalDays: 7,
            revision: service.revision,
            reason: String(form.get("reason")).trim(),
          };
          const fingerprint = JSON.stringify(draft);
          if (key.current?.fingerprint !== fingerprint)
            key.current = { fingerprint, value: crypto.randomUUID() };
          command.mutate(
            { ...draft, idempotencyKey: key.current.value },
            {
              onSuccess: () => {
                key.current = null;
              },
            },
          );
        }}
      >
        <label>
          {t("startAt")}
          <IranianDateTimeInput name="start" required />
        </label>
        <label>
          {t("endAt")}
          <IranianDateTimeInput name="end" required />
        </label>
        <label>
          {t("capacityTotal")}
          <Input
            name="capacity"
            type="number"
            min="1"
            max="10000"
            defaultValue="10"
            required
          />
        </label>
        <label>
          {t("repeatCount")}
          <Input
            name="count"
            type="number"
            min="1"
            max="52"
            defaultValue="1"
            required
          />
        </label>
        <label>
          {t("reason")}
          <Input name="reason" minLength={5} maxLength={500} required />
        </label>
        {invalid && <p role="alert">{t("endAfterStart")}</p>}
        <QueryError error={command.error} />
        {command.isSuccess && <p role="status">{t("created")}</p>}
        <Button type="submit" disabled={command.isPending}>
          {t("save")}
        </Button>
      </form>
    </details>
  );
}
