"use client";
import { ActionEditor } from "../account/action-editor";
import { useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type SportsResourceDto,
  type ResourceCalendarEventDto,
  type ResourceBlockDto,
  type ResourceSettingsInput,
  type ResourceCreateInput,
  type ResourceBlockInput,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../kit/Card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "../kit/Field";
import { Empty, EmptyHeader, EmptyDescription } from "../kit/Empty";
import { Separator } from "../kit/Separator";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";

function useRequestKey() {
  const previous = useRef<{ fingerprint: string; key: string } | null>(null);
  return {
    getKey: (input: unknown) => {
      const fingerprint = JSON.stringify(input);
      if (previous.current?.fingerprint !== fingerprint)
        previous.current = { fingerprint, key: crypto.randomUUID() };
      return previous.current.key;
    },
    reset: () => {
      previous.current = null;
    },
  };
}
function localDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function PeriodFields({
  prefix,
  from,
  to,
  error,
  onEdited,
}: {
  prefix: string;
  from?: string;
  to?: string;
  error?: string;
  onEdited?: () => void;
}) {
  const t = useTranslations("Luma");
  const [start, setStart] = useState(from ?? "");
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${prefix}-start`}>
          {t("resourcePeriodStart")}
        </FieldLabel>
        <Input
          className="min-h-11"
          id={`${prefix}-start`}
          name="start"
          type="datetime-local"
          required
          defaultValue={from}
          onChange={(e) => {
            setStart(e.target.value);
            onEdited?.();
          }}
        />
      </Field>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${prefix}-end`}>
          {t("resourcePeriodEnd")}
        </FieldLabel>
        <Input
          className="min-h-11"
          id={`${prefix}-end`}
          name="end"
          type="datetime-local"
          min={start || undefined}
          required
          defaultValue={to}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${prefix}-error` : undefined}
          onChange={onEdited}
        />
        {error && (
          <FieldError role="alert" id={`${prefix}-error`}>
            {error}
          </FieldError>
        )}
      </Field>
    </>
  );
}
function readPeriod(form: HTMLFormElement) {
  const data = new FormData(form);
  const start = new Date(String(data.get("start"))),
    end = new Date(String(data.get("end")));
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  )
    return null;
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
function ResourceEmpty({ children }: { children: ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function ResourceManager({
  org,
  branch,
}: {
  org: string;
  branch: string;
}) {
  const t = useTranslations("Luma");
  const id = useId();
  const query = useSportsQuery<SportsResourceDto[]>(
    "business/sports/resources",
    { organizationId: org, branchId: branch },
  );
  const create = useSportsCommand<{ id: string }>("business/sports/resources");
  const createKey = useRequestKey();
  const [selected, setSelected] = useState("");
  const [created, setCreated] = useState(false);
  const current = query.data?.find((r) => r.id === selected) ?? query.data?.[0];
  return (
    <div className="flex flex-col gap-6">
      <ActionEditor
        title={t("newResource")}
        description={t("resourceCreateHint")}
        busy={create.isPending}
        completed={create.isSuccess}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const shared = query.data?.find((r) => r.id === data.get("shared"));
            setCreated(false);
            const input: Omit<ResourceCreateInput, "idempotencyKey"> = {
              organizationId: org,
              branchId: branch,
              name: String(data.get("name")),
              unitIds: shared?.unitIds ?? [],
            };
            create.mutate(
              { ...input, idempotencyKey: createKey.getKey(input) },
              {
                onSuccess: (resource) => {
                  form.reset();
                  setSelected(resource.id);
                  setCreated(true);
                  createKey.reset();
                },
              },
            );
          }}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>
                {t("resourceName")}
              </FieldLabel>
              <Input
                className="min-h-11"
                id={`${id}-name`}
                name="name"
                minLength={2}
                maxLength={120}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-shared`}>
                {t("resourceSharesWith")}
              </FieldLabel>
              <NativeSelect
                className="min-h-11 w-full [&_select]:min-h-11"
                id={`${id}-shared`}
                name="shared"
              >
                <NativeSelectOption value="">
                  {t("resourceIndependent")}
                </NativeSelectOption>
                {query.data?.map((r) => (
                  <NativeSelectOption key={r.id} value={r.id}>
                    {r.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{t("resourceSharedHint")}</FieldDescription>
            </Field>
          </FieldGroup>
          <QueryError error={create.error} />
          {created && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {t("resourceCreated")}
            </p>
          )}
          <Button className="mt-4 min-h-11" disabled={create.isPending}>
            {t("newResource")}
          </Button>
        </form>
      </ActionEditor>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <QueryError error={query.error} retry={() => query.refetch()} />
      ) : !current ? (
        <ResourceEmpty>{t("resourceEmpty")}</ResourceEmpty>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor={`${id}-selected`}>
              {t("resourceSelect")}
            </FieldLabel>
            <NativeSelect
              className="min-h-11 w-full [&_select]:min-h-11"
              id={`${id}-selected`}
              value={current.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {query.data?.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {r.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <ResourceEditor
            key={current.id}
            resource={current}
            onEditing={() => setSelected(current.id)}
          />
        </>
      )}
    </div>
  );
}
function ResourceEditor({
  resource,
  onEditing,
}: {
  resource: SportsResourceDto;
  onEditing: () => void;
}) {
  const t = useTranslations("Luma"),
    locale = useLocale();
  const id = useId();
  const settings = useSportsCommand<SportsResourceDto>(
    `business/sports-resources/${resource.id}/settings`,
  );
  const block = useSportsCommand<ResourceBlockDto>(
    `business/sports-resources/${resource.id}/blocks`,
  );
  const settingsKey = useRequestKey(),
    blockKey = useRequestKey();
  const [message, setMessage] = useState<
    "" | "resourceSaved" | "resourceBlockSaved" | "resourceBlockCancelled"
  >("");
  const [periodError, setPeriodError] = useState(false);
  const [range, setRange] = useState(() => ({
    from: new Date().toISOString(),
    to: new Date(Date.now() + 14 * 86400000).toISOString(),
  }));
  const calendar = useSportsQuery<ResourceCalendarEventDto[]>(
    `business/sports-resources/${resource.id}/calendar`,
    range,
  );
  const [rangeError, setRangeError] = useState(false);
  const calendarTitle = useRef<HTMLDivElement>(null);
  const settingsTitle = useRef<HTMLDivElement>(null);
  const stamp = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <p role="status" className="text-sm text-muted-foreground lg:col-span-2">
        {message ? t(message) : ""}
      </p>
      <Card>
        <CardHeader>
          <CardTitle
            role="heading"
            aria-level={2}
            tabIndex={-1}
            ref={settingsTitle}
          >
            {t("resourceSettings")}
          </CardTitle>
          <CardDescription>{t("resourceBufferHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            key={resource.revision}
            onSubmit={(e) => {
              e.preventDefault();
              onEditing();
              const data = new FormData(e.currentTarget);
              const input: Omit<ResourceSettingsInput, "idempotencyKey"> = {
                name: String(data.get("name")),
                bufferBeforeMinutes: Number(data.get("before")),
                bufferAfterMinutes: Number(data.get("after")),
                revision: resource.revision,
                reason: String(data.get("reason")),
              };
              setMessage("");
              settings.mutate(
                { ...input, idempotencyKey: settingsKey.getKey(input) },
                {
                  onSuccess: () => {
                    setMessage("resourceSaved");
                    settingsTitle.current?.focus();
                  },
                },
              );
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-edit-name`}>
                  {t("resourceName")}
                </FieldLabel>
                <Input
                  className="min-h-11"
                  id={`${id}-edit-name`}
                  name="name"
                  minLength={2}
                  maxLength={120}
                  defaultValue={resource.name}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-before`}>
                    {t("resourceBufferBefore")}
                  </FieldLabel>
                  <Input
                    className="min-h-11"
                    id={`${id}-before`}
                    name="before"
                    type="number"
                    min={0}
                    max={240}
                    step={1}
                    defaultValue={resource.bufferBeforeMinutes}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-after`}>
                    {t("resourceBufferAfter")}
                  </FieldLabel>
                  <Input
                    className="min-h-11"
                    id={`${id}-after`}
                    name="after"
                    type="number"
                    min={0}
                    max={240}
                    step={1}
                    defaultValue={resource.bufferAfterMinutes}
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`${id}-settings-reason`}>
                  {t("reason")}
                </FieldLabel>
                <Textarea
                  id={`${id}-settings-reason`}
                  name="reason"
                  minLength={3}
                  maxLength={1000}
                  required
                />
              </Field>
            </FieldGroup>
            <QueryError error={settings.error} />
            <Button className="mt-4 min-h-11" disabled={settings.isPending}>
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t("resourceNewBlock")}
          </CardTitle>
          <CardDescription>{t("resourceBlockHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                period = readPeriod(form);
              if (!period) {
                setPeriodError(true);
                return;
              }
              setPeriodError(false);
              const data = new FormData(form);
              const input: Omit<ResourceBlockInput, "idempotencyKey"> = {
                ...period,
                kind:
                  data.get("kind") === "maintenance"
                    ? "maintenance"
                    : "closure",
                revision: resource.revision,
                reason: String(data.get("reason")),
              };
              setMessage("");
              block.mutate(
                { ...input, idempotencyKey: blockKey.getKey(input) },
                {
                  onSuccess: () => {
                    form.reset();
                    setMessage("resourceBlockSaved");
                  },
                },
              );
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-kind`}>
                  {t("resourceBlockKind")}
                </FieldLabel>
                <NativeSelect
                  className="min-h-11 w-full [&_select]:min-h-11"
                  id={`${id}-kind`}
                  name="kind"
                >
                  <NativeSelectOption value="maintenance">
                    {t("resourceMaintenance")}
                  </NativeSelectOption>
                  <NativeSelectOption value="closure">
                    {t("resourceClosure")}
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              <PeriodFields
                prefix={`${id}-block`}
                error={periodError ? t("resourcePeriodError") : undefined}
                onEdited={() => setPeriodError(false)}
              />
              <FieldDescription>
                {t("resourceDeviceTimeHint", { timeZone })}
              </FieldDescription>
              <Field>
                <FieldLabel htmlFor={`${id}-block-reason`}>
                  {t("reason")}
                </FieldLabel>
                <Textarea
                  id={`${id}-block-reason`}
                  name="reason"
                  minLength={3}
                  maxLength={1000}
                  required
                />
              </Field>
            </FieldGroup>
            <QueryError error={block.error} />
            <Button className="mt-4 min-h-11" disabled={block.isPending}>
              {t("resourceNewBlock")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle
            role="heading"
            aria-level={2}
            tabIndex={-1}
            ref={calendarTitle}
          >
            {t("resourceCalendar")}
          </CardTitle>
          <CardDescription>{t("resourceCalendarHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const period = readPeriod(e.currentTarget);
              if (
                !period ||
                Date.parse(period.endAt) - Date.parse(period.startAt) >
                  93 * 86400000
              ) {
                setRangeError(true);
                return;
              }
              setRangeError(false);
              setRange({ from: period.startAt, to: period.endAt });
            }}
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <PeriodFields
                prefix={`${id}-range`}
                from={localDateTime(new Date(range.from))}
                to={localDateTime(new Date(range.to))}
                error={rangeError ? t("resourcePeriodError") : undefined}
                onEdited={() => setRangeError(false)}
              />
            </FieldGroup>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("resourceDeviceTimeHint", { timeZone })}
            </p>
            <Button
              className="mt-4 min-h-11"
              variant="outline"
              disabled={calendar.isFetching}
            >
              {t("resourceShowCalendar")}
            </Button>
          </form>
          <Separator className="my-5" />
          {calendar.isPending ? (
            <Loading />
          ) : calendar.error ? (
            <QueryError
              error={calendar.error}
              retry={() => calendar.refetch()}
            />
          ) : !calendar.data?.length ? (
            <ResourceEmpty>{t("resourceCalendarEmpty")}</ResourceEmpty>
          ) : (
            <ul
              className="flex flex-col gap-5"
              aria-label={t("resourceCalendar")}
            >
              {calendar.data.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4"
                >
                  <h3 className="font-semibold">
                    {event.kind === "session"
                      ? event.title
                      : t(
                          event.kind === "maintenance"
                            ? "resourceMaintenance"
                            : "resourceClosure",
                        )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stamp(event.startAt)} – {stamp(event.endAt)}
                  </p>
                  {event.kind !== "session" && (
                    <p className="whitespace-pre-wrap text-sm">{event.title}</p>
                  )}
                  {event.blockId && event.blockRevision && (
                    <CancelResourceBlock
                      resourceId={resource.id}
                      event={event}
                      onSaved={() => {
                        setMessage("resourceBlockCancelled");
                        calendarTitle.current?.focus();
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function CancelResourceBlock({
  resourceId,
  event,
  onSaved,
}: {
  resourceId: string;
  event: ResourceCalendarEventDto;
  onSaved: () => void;
}) {
  const t = useTranslations("Luma");
  const id = useId();
  const key = useRequestKey();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useSportsCommand(
    `business/sports-resources/${resourceId}/blocks/${event.blockId}/cancel`,
  );
  return (
    <>
      <Button
        ref={trigger}
        className="min-h-11 self-start"
        variant="outline"
        aria-expanded={open}
        aria-controls={`${id}-cancel`}
        onClick={() => setOpen(!open)}
      >
        {t("resourceCancelBlock")}
      </Button>
      {open && (
        <form
          id={`${id}-cancel`}
          onSubmit={(e) => {
            e.preventDefault();
            const input = {
              revision: event.blockRevision,
              reason: String(new FormData(e.currentTarget).get("reason")),
            };
            cancel.mutate(
              { ...input, idempotencyKey: key.getKey(input) },
              { onSuccess: onSaved },
            );
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-reason`}>{t("reason")}</FieldLabel>
              <Textarea
                id={`${id}-reason`}
                name="reason"
                minLength={3}
                maxLength={1000}
                required
                autoFocus
              />
            </Field>
            <FieldDescription>{t("resourceCancelHint")}</FieldDescription>
          </FieldGroup>
          <QueryError error={cancel.error} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button className="min-h-11" disabled={cancel.isPending}>
              {t("resourceConfirmCancel")}
            </Button>
            <Button
              className="min-h-11"
              type="button"
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              {t("back")}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
