"use client";
import { useId, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSaveSportsCalendar,
  type HostCalendarDto,
  type CalendarSettingsDto,
} from "@repo/api/sports";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../kit/Card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "../kit/Field";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { Button } from "../kit/Button";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";

export function CalendarManager({
  org,
  branch,
}: {
  org: string;
  branch: string;
}) {
  const t = useTranslations("Luma");
  const query = useSportsQuery<HostCalendarDto>(
    "sports/community/host/calendar",
    { organizationId: org, branchId: branch },
  );
  if (query.isPending) return <Loading />;
  if (query.error && !query.data)
    return <QueryError error={query.error} retry={() => query.refetch()} />;
  if (!query.data) return null;
  if (!query.data.canManage)
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{query.data.calendar?.title ?? t("publicBranchCalendar")}</h2>
          </CardTitle>
          <CardDescription>{t("calendarReadonly")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap break-words">
            {query.data.calendar?.description ?? t("calendarNotCreated")}
          </p>
        </CardContent>
      </Card>
    );
  return (
    <>
      <CalendarEditor
        key={`${org}:${branch}`}
        scope={{ organizationId: org, branchId: branch }}
        data={query.data}
        reload={async () => {
          const result = await query.refetch();
          return result.error ? null : (result.data?.calendar ?? null);
        }}
      />
      {query.error && <QueryError error={query.error} />}
    </>
  );
}
function CalendarEditor({
  scope,
  data,
  reload,
}: {
  scope: { organizationId: string; branchId: string };
  data: HostCalendarDto;
  reload(): Promise<CalendarSettingsDto | null>;
}) {
  const t = useTranslations("Luma"),
    id = useId(),
    heading = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState(() => ({
    title:
      data.calendar?.title ??
      `${data.clubName} · ${data.branchName}`.slice(0, 160),
    description: data.calendar?.description ?? "",
    revision: data.calendar?.revision ?? 0,
  }));
  const [notice, setNotice] = useState(false),
    [reloading, setReloading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const key = useRef<string | null>(null),
    save = useSaveSportsCalendar(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>
            {t("publicBranchCalendar")}
          </h2>
        </CardTitle>
        <CardDescription id={`${id}-hint`}>
          {t("calendarPublicHint")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-hint`}
          onSubmit={(event) => {
            event.preventDefault();
            if (form.title.trim().length < 2) {
              setTitleError(true);
              requestAnimationFrame(() =>
                document.getElementById(`${id}-name`)?.focus(),
              );
              return;
            }
            key.current ??= crypto.randomUUID();
            save.mutate(
              {
                ...form,
                title: form.title.trim(),
                idempotencyKey: key.current,
              },
              {
                onSuccess: (result) => {
                  setForm({
                    title: result.title,
                    description: result.description,
                    revision: result.revision,
                  });
                  key.current = null;
                  setNotice(true);
                  heading.current?.focus();
                },
              },
            );
          }}
        >
          <fieldset disabled={save.isPending || reloading} className="min-w-0">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>
                  {t("calendarTitle")}
                </FieldLabel>
                <Input
                  id={`${id}-name`}
                  className="min-h-11"
                  value={form.title}
                  minLength={2}
                  maxLength={160}
                  required
                  aria-invalid={titleError || undefined}
                  aria-describedby={titleError ? `${id}-name-error` : undefined}
                  onChange={(event) => {
                    setTitleError(false);
                    setForm({ ...form, title: event.target.value });
                    key.current = null;
                    setNotice(false);
                  }}
                />
                {titleError && (
                  <p
                    id={`${id}-name-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t("calendarTitleRequired")}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-description`}>
                  {t("description")}
                </FieldLabel>
                <Textarea
                  id={`${id}-description`}
                  aria-describedby={`${id}-description-hint`}
                  value={form.description}
                  maxLength={2000}
                  rows={3}
                  onChange={(event) => {
                    setForm({ ...form, description: event.target.value });
                    key.current = null;
                    setNotice(false);
                  }}
                />
                <FieldDescription id={`${id}-description-hint`}>
                  {t("calendarDescriptionHint")}
                </FieldDescription>
              </Field>
              <Button type="submit" className="min-h-11">
                {save.isPending ? t("saving") : t("save")}
              </Button>
            </FieldGroup>
          </fieldset>
          <QueryError error={save.error} />
          {save.error?.status === 409 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {t("calendarReloadHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 mt-2"
                disabled={reloading}
                onClick={() => {
                  setReloading(true);
                  void reload()
                    .then((current) => {
                      if (current) {
                        setForm({
                          title: current.title,
                          description: current.description,
                          revision: current.revision,
                        });
                        key.current = null;
                        save.reset();
                        setNotice(false);
                        requestAnimationFrame(() => heading.current?.focus());
                      }
                    })
                    .finally(() => setReloading(false));
                }}
              >
                {t("reloadCalendar")}
              </Button>
            </div>
          )}
          {notice && (
            <p className="mt-4 text-sm" role="status">
              {t("calendarSaved")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
