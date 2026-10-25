"use client";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "../kit/Sileo";
import { changeReasonError } from "./change-reason";
import { ChangeReasonField } from "./change-reason-field";
import {
  isActiveSurfaceElement,
  restoreOverlayFocus,
} from "../lib/active-surface";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useBusinessTariffs,
  useSaveTariff,
  useSetTariffStatus,
  useTariffHistory,
} from "@repo/api/business";
import type {
  ClubDto,
  TariffDto,
  TariffService,
  TariffUnit,
} from "@repo/api/catalog";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/kit/Card";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Textarea } from "@repo/ui/kit/Textarea";
import { Loading, QueryError, ErrorNotice, TextField, Submit } from "./common";

const services = ["visit", "membership", "court", "class", "coaching"] as const;
const units = [
  "visit",
  "hour",
  "session",
  "month",
  "package",
  "course",
] as const;
export function BusinessTariffs({
  club,
  editable,
  allBranches,
}: {
  club: ClubDto;
  editable: boolean;
  allBranches: boolean;
}) {
  const t = useTranslations("Tariffs");
  const locale = useLocale();
  const query = useBusinessTariffs(club.id);
  const status = useSetTariffStatus();
  const audit = useTranslations("AuditReason");
  const [statusTarget, setStatusTarget] = useState<TariffDto | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusAttempted, setStatusAttempted] = useState(false);
  const statusPending = useRef(false);
  const statusTrigger = useRef<HTMLButtonElement | null>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusTarget || statusPending.current) return;
    setStatusAttempted(true);
    if (changeReasonError(statusReason)) {
      event.currentTarget
        .querySelector<HTMLTextAreaElement>("[data-change-reason]")
        ?.focus();
      return;
    }
    statusPending.current = true;
    const origin =
      document.activeElement === document.body
        ? (event.nativeEvent as SubmitEvent).submitter
        : document.activeElement;
    try {
      await status.mutateAsync({
        id: club.id,
        tariffId: statusTarget.id,
        isActive: !statusTarget.isActive,
        reason: statusReason.trim(),
      });
      setStatusTarget(null);
      toast.success(audit("saved"));
      restoreOverlayFocus(statusTrigger.current);
    } catch {
      requestAnimationFrame(() => {
        if (
          origin instanceof HTMLElement &&
          isActiveSurfaceElement(origin) &&
          document.activeElement === document.body
        )
          origin.focus();
      });
    } finally {
      statusPending.current = false;
    }
  }
  const [editing, setEditing] = useState<TariffDto | null>();
  const [historyId, setHistoryId] = useState<string>();
  const [page, setPage] = useState(1);
  const history = useTariffHistory(club.id, historyId, page);
  const number = new Intl.NumberFormat(locale);
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 [&_button]:min-h-11 [&_button]:min-w-11">
        <QueryError error={query.error} retry={query.refetch} />
        {query.isLoading && <Loading />}
        {!query.isLoading && !query.error && !query.data?.length && (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {(query.data ?? []).map((tariff) => (
          <article
            key={tariff.id}
            className="grid gap-3 rounded-2xl border p-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="font-semibold">{tariff.name}</h3>
              <p>
                {number.format(tariff.priceToman)} {t("toman")} /{" "}
                {t(`unit_${tariff.unit}`)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`service_${tariff.serviceType}`)} ·{" "}
              {tariff.branchId
                ? club.branches.find((branch) => branch.id === tariff.branchId)
                    ?.name
                : t("allBranches")}{" "}
              · {t("version", { version: number.format(tariff.version) })} ·{" "}
              {date(tariff.effectiveFrom)} ·{" "}
              {t(tariff.isActive ? "active" : "inactive")}
            </p>
            <p className="whitespace-pre-line text-sm">{tariff.conditions}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHistoryId(tariff.id);
                  setPage(1);
                }}
              >
                {t("history")}
              </Button>
              {editable && (allBranches || tariff.branchId !== null) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      editTrigger.current = event.currentTarget;
                      setEditing(tariff);
                    }}
                  >
                    {t("revise")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={status.isPending}
                    onClick={(event) => {
                      if (statusPending.current) return;
                      statusTrigger.current = event.currentTarget;
                      setStatusReason("");
                      setStatusAttempted(false);
                      setStatusTarget(tariff);
                    }}
                  >
                    {t(tariff.isActive ? "deactivate" : "activate")}
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
        {statusTarget && (
          <form
            noValidate
            onSubmit={changeStatus}
            className="grid gap-4 rounded-2xl border p-4"
          >
            <fieldset disabled={status.isPending} className="grid gap-4">
              <h3 className="font-semibold">
                {t(statusTarget.isActive ? "deactivate" : "activate")}{" "}
                {statusTarget.name}
              </h3>
              <ChangeReasonField
                value={statusReason}
                onChange={setStatusReason}
                error={
                  statusAttempted ? changeReasonError(statusReason) : undefined
                }
                disabled={status.isPending}
              />
              <div className="flex gap-3">
                <Submit busy={status.isPending}>{audit("confirm")}</Submit>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={status.isPending}
                  onClick={() => {
                    if (!statusPending.current) {
                      setStatusTarget(null);
                      restoreOverlayFocus(statusTrigger.current);
                    }
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </fieldset>
            <ErrorNotice error={status.error} />
          </form>
        )}
        {historyId && (
          <section className="grid gap-3 border-t pt-4">
            <h3 className="font-semibold">{t("history")}</h3>
            <QueryError error={history.error} retry={history.refetch} />
            {history.isLoading && <Loading />}
            {(history.data ?? []).map((version) => (
              <article
                key={version.versionId}
                className="grid gap-2 rounded-xl bg-muted p-3 text-sm"
              >
                <p>
                  {version.name} ·{" "}
                  {t("version", { version: number.format(version.version) })} ·{" "}
                  {date(version.effectiveFrom)}
                </p>
                <p>
                  {number.format(version.priceToman)} {t("toman")} /{" "}
                  {t(`unit_${version.unit}`)}
                </p>
                <p className="whitespace-pre-line">{version.conditions}</p>
              </article>
            ))}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={page === 1 || history.isFetching}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </Button>
              <Button
                variant="ghost"
                disabled={
                  (history.data?.length ?? 0) < 25 || history.isFetching
                }
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </Button>
              <Button variant="ghost" onClick={() => setHistoryId(undefined)}>
                {t("close")}
              </Button>
            </div>
          </section>
        )}
        {editable && editing === undefined && (
          <Button
            variant="outline"
            className="w-fit"
            onClick={(event) => {
              editTrigger.current = event.currentTarget;
              setEditing(null);
            }}
          >
            {t("add")}
          </Button>
        )}
        {editable && editing !== undefined && (
          <TariffForm
            key={editing?.versionId ?? "new"}
            club={club}
            previous={editing}
            allBranches={allBranches}
            onDone={() => {
              setEditing(undefined);
              restoreOverlayFocus(editTrigger.current);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
function TariffForm({
  club,
  previous,
  allBranches,
  onDone,
}: {
  club: ClubDto;
  previous: TariffDto | null;
  allBranches: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("Tariffs");
  const save = useSaveTariff();
  const audit = useTranslations("AuditReason");
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const pending = useRef(false);
  const optionalNumber = (value: FormDataEntryValue | null) =>
    value ? Number(value) : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setAttempted(true);
    if (previous && changeReasonError(reason)) {
      event.currentTarget
        .querySelector<HTMLTextAreaElement>("[data-change-reason]")
        ?.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    const origin =
      document.activeElement === document.body
        ? (event.nativeEvent as SubmitEvent).submitter
        : document.activeElement;
    pending.current = true;
    try {
      const terms = {
        name: String(data.get("tariffName")),
        serviceType: String(data.get("serviceType")) as TariffService,
        priceToman: Number(data.get("priceToman")),
        unit: String(data.get("unit")) as TariffUnit,
        durationDays: optionalNumber(data.get("durationDays")),
        sessionCount: optionalNumber(data.get("sessionCount")),
        includedServices: String(data.get("includedServices") ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        conditions: String(data.get("conditions")),
      };
      await save.mutateAsync(
        previous
          ? {
              id: club.id,
              tariffId: previous.id,
              input: { ...terms, reason: reason.trim() },
            }
          : {
              id: club.id,
              input: {
                ...terms,
                branchId: String(data.get("tariffBranch")) || null,
              },
            },
      );
      toast.success(audit("saved"));
      onDone();
    } catch {
      requestAnimationFrame(() => {
        if (
          origin instanceof HTMLElement &&
          isActiveSurfaceElement(origin) &&
          document.activeElement === document.body
        )
          origin.focus();
      });
    } finally {
      pending.current = false;
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-5 rounded-2xl border p-4 [&_input]:min-h-11 [&_select]:min-h-11"
    >
      <fieldset disabled={save.isPending} className="grid gap-5">
        <h3 className="font-semibold">{t(previous ? "revise" : "add")}</h3>
        <TextField
          name="tariffName"
          label={t("name")}
          defaultValue={previous?.name ?? ""}
          required
          minLength={2}
          maxLength={120}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="serviceType">{t("service")}</FieldLabel>
            <NativeSelect
              id="serviceType"
              name="serviceType"
              defaultValue={previous?.serviceType ?? "visit"}
            >
              {services.map((service) => (
                <NativeSelectOption key={service} value={service}>
                  {t(`service_${service}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="unit">{t("unit")}</FieldLabel>
            <NativeSelect
              id="unit"
              name="unit"
              defaultValue={previous?.unit ?? "visit"}
            >
              {units.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {t(`unit_${unit}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {!previous && (
          <Field>
            <FieldLabel htmlFor="tariffBranch">{t("branch")}</FieldLabel>
            <NativeSelect
              id="tariffBranch"
              name="tariffBranch"
              defaultValue={allBranches ? "" : club.branches[0]?.id}
            >
              {allBranches && (
                <NativeSelectOption value="">
                  {t("allBranches")}
                </NativeSelectOption>
              )}
              {club.branches.map((branch) => (
                <NativeSelectOption key={branch.id} value={branch.id}>
                  {branch.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <TextField
          name="priceToman"
          type="number"
          label={t("price")}
          defaultValue={previous?.priceToman ?? ""}
          required
          min={0}
          max={1000000000}
          step={1}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="durationDays"
            type="number"
            label={t("duration")}
            defaultValue={previous?.durationDays ?? ""}
            min={1}
            max={3660}
            step={1}
          />
          <TextField
            name="sessionCount"
            type="number"
            label={t("sessions")}
            defaultValue={previous?.sessionCount ?? ""}
            min={1}
            max={10000}
            step={1}
          />
        </div>
        <Field>
          <FieldLabel htmlFor="includedServices">{t("included")}</FieldLabel>
          <Textarea
            id="includedServices"
            name="includedServices"
            defaultValue={previous?.includedServices?.join("\n") ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="conditions">{t("conditions")}</FieldLabel>
          <Textarea
            id="conditions"
            name="conditions"
            defaultValue={previous?.conditions ?? ""}
            required
            minLength={2}
            maxLength={5000}
          />
        </Field>
        {previous && (
          <ChangeReasonField
            value={reason}
            onChange={setReason}
            error={attempted ? changeReasonError(reason) : undefined}
            disabled={save.isPending}
          />
        )}
        <div className="flex gap-3">
          <Submit busy={save.isPending}>{t("save")}</Submit>
          <Button
            type="button"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => {
              if (!pending.current) onDone();
            }}
          >
            {t("cancel")}
          </Button>
        </div>
      </fieldset>
      <ErrorNotice error={save.error} />
    </form>
  );
}
