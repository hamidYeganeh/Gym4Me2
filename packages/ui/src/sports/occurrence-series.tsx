"use client";
import { BusinessFieldSteps } from "../account/business-form-steps";
import { IranianDateTimeInput } from "../kit/IranianDateInput";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type OccurrenceSeriesSummaryDto,
  type OccurrenceSeriesEditInput,
  type OccurrenceSeriesEditDto,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
} from "../kit/Field";
import { Separator } from "../kit/Separator";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";
function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function OccurrenceSeriesManager({ serviceId }: { serviceId: string }) {
  const t = useTranslations("Luma");
  const locale = useLocale();
  const query = useSportsQuery<OccurrenceSeriesSummaryDto[]>(
    `business/sports/services/${serviceId}/occurrence-series`,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  if (query.isPending) return <Loading />;
  if (query.error)
    return <QueryError error={query.error} retry={() => query.refetch()} />;
  if (!query.data?.length) return null;
  return (
    <section aria-label={t("scheduledSeries")} className="mt-6">
      <Separator className="mb-5" />
      <h3 className="font-semibold mb-3">{t("scheduledSeries")}</h3>
      {saved && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          {t("seriesUpdated")}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {query.data.map((series) => (
          <div
            key={series.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {new Intl.DateTimeFormat(
                    locale === "fa" ? "fa-IR-u-ca-persian" : "en-US",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  ).format(new Date(series.startAt))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("seriesSummary", {
                    count: series.occurrenceCount,
                    capacity: series.capacity,
                  })}
                </p>
              </div>
              {series.editable ? (
                <Button
                  variant="outline"
                  className="min-h-11"
                  ref={(element) => {
                    if (element) editButtons.current.set(series.id, element);
                    else editButtons.current.delete(series.id);
                  }}
                  aria-expanded={selected === series.id}
                  onClick={() => {
                    setSaved(false);
                    setSelected(selected === series.id ? null : series.id);
                  }}
                >
                  {t("editSeries")}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("seriesEditLocked")}
                </span>
              )}
            </div>
            {selected === series.id && (
              <OccurrenceSeriesEditor
                key={`${series.id}:${series.revision}`}
                serviceId={serviceId}
                series={series}
                onSaved={() => {
                  setSelected(null);
                  setSaved(true);
                  editButtons.current.get(series.id)?.focus();
                }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function OccurrenceSeriesEditor({
  serviceId,
  series,
  onSaved,
}: {
  serviceId: string;
  series: OccurrenceSeriesSummaryDto;
  onSaved: () => void;
}) {
  const t = useTranslations("Luma");
  const edit = useSportsCommand<OccurrenceSeriesEditDto>(
    `business/sports/services/${serviceId}/occurrence-series/${series.id}/edit`,
  );
  const editKey = useRef<{ fingerprint: string; value: string } | null>(null);
  const [validationError, setValidationError] = useState("");
  return (
    <form
      className="mt-4"
      aria-label={t("editSeries")}
      aria-busy={edit.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        setValidationError("");
        edit.reset();
        const fields = new FormData(event.currentTarget);
        const start = new Date(String(fields.get("start")));
        const end = new Date(String(fields.get("end")));
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime()) ||
          end <= start
        ) {
          setValidationError(t("endAfterStart"));
          return;
        }
        const draft = {
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: Number(fields.get("capacity")),
          intervalDays: Number(fields.get("interval")) as 1 | 7 | 14,
          revision: series.revision,
          reason: String(fields.get("reason") ?? "").trim(),
        };
        const fingerprint = JSON.stringify(draft);
        if (editKey.current?.fingerprint !== fingerprint) {
          editKey.current = { fingerprint, value: crypto.randomUUID() };
        }
        const input: OccurrenceSeriesEditInput = {
          ...draft,
          idempotencyKey: editKey.current.value,
        };
        edit.mutate(input, {
          onSuccess: () => {
            editKey.current = null;
            onSaved();
          },
        });
      }}
    >
      <BusinessFieldSteps>
        <Separator className="mb-4" />
        <FieldSet disabled={edit.isPending}>
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <p
              id={`${series.id}-hint`}
              className="sm:col-span-3 text-sm text-muted-foreground"
            >
              {t("seriesEditHint")}
            </p>
            <Field data-invalid={Boolean(validationError)}>
              <FieldLabel htmlFor={`${series.id}-start`}>
                {t("startAt")}
              </FieldLabel>
              <IranianDateTimeInput
                id={`${series.id}-start`}
                className="min-h-11"
                name="start"

                defaultValue={localDateTime(series.startAt)}
                aria-invalid={Boolean(validationError)}
                aria-describedby={
                  validationError ? `${series.id}-error` : `${series.id}-hint`
                }
                required
              />
            </Field>
            <Field data-invalid={Boolean(validationError)}>
              <FieldLabel htmlFor={`${series.id}-end`}>{t("endAt")}</FieldLabel>
              <IranianDateTimeInput
                id={`${series.id}-end`}
                className="min-h-11"
                name="end"

                defaultValue={localDateTime(series.endAt)}
                aria-invalid={Boolean(validationError)}
                aria-describedby={
                  validationError ? `${series.id}-error` : undefined
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${series.id}-capacity`}>
                {t("capacityTotal")}
              </FieldLabel>
              <Input
                id={`${series.id}-capacity`}
                className="min-h-11"
                name="capacity"
                type="number"
                min="1"
                max="10000"
                defaultValue={series.capacity}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${series.id}-interval`}>
                {t("repeatInterval")}
              </FieldLabel>
              <NativeSelect
                id={`${series.id}-interval`}
                className="[&_select]:min-h-11"
                name="interval"
                defaultValue={String(series.intervalDays)}
              >
                <NativeSelectOption value="1">{t("daily")}</NativeSelectOption>
                <NativeSelectOption value="7">{t("weekly")}</NativeSelectOption>
                <NativeSelectOption value="14">
                  {t("fortnightly")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${series.id}-reason`}>
                {t("changeReason")}
              </FieldLabel>
              <Input
                id={`${series.id}-reason`}
                className="min-h-11"
                name="reason"
                minLength={5}
                maxLength={500}
                required
              />
            </Field>
            {validationError && (
              <FieldError
                id={`${series.id}-error`}
                role="alert"
                className="sm:col-span-3"
              >
                {validationError}
              </FieldError>
            )}
            <div className="sm:col-span-3">
              <QueryError error={edit.error} />
              <Button
                type="submit"
                className="min-h-11"
                disabled={edit.isPending}
              >
                {t("save")}
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </BusinessFieldSteps>
    </form>
  );
}
