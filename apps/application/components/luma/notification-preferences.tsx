"use client";
import { DeviceNotifications } from "./device-notifications";

import { useId, useRef, useState, type FormEvent } from "react";
import type { ApiError } from "@repo/api";
import {
  useSportsCommand,
  useSportsQuery,
  type NotificationPreferencesDto,
} from "@repo/api/sports";
import { Button } from "@repo/ui/kit/Button";
import { Checkbox } from "@repo/ui/kit/Checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@repo/ui/kit/Field";
import { ErrorNotice, SuccessNotice } from "@repo/ui/account";
import { useQueryRetry } from "@repo/ui/hooks/use-query-retry";
import {
  notificationPreferenceKeys,
  preferenceDraft,
  preferencesDirty,
  refreshPreferenceDraft,
} from "../../lib/notification-preferences";
import { CommandError, LumaPage, QueryState, useLuma } from "./common";

export function NotificationPreferences() {
  const t = useLuma();
  const query = useSportsQuery<NotificationPreferencesDto>(
    "sports/community/preferences",
  );
  const canEdit = query.data && ![401, 403].includes(query.error?.status ?? 0);
  return (
    <LumaPage title={t("notifyPreferences")} back="/notifications">
      <DeviceNotifications />
      {canEdit ? (
        <PreferencesForm
          snapshot={query.data!}
          refresh={() => query.refetch()}
          refreshing={query.isFetching}
          refreshError={query.error}
        />
      ) : (
        <QueryState query={query}>{null}</QueryState>
      )}
    </LumaPage>
  );
}

function PreferencesForm({
  snapshot,
  refresh,
  refreshing,
  refreshError,
}: {
  snapshot: NotificationPreferencesDto;
  refresh: () => Promise<{
    isSuccess: boolean;
    data?: NotificationPreferencesDto;
  }>;
  refreshing: boolean;
  refreshError: ApiError | null;
}) {
  const t = useLuma();
  const id = useId();
  // This is an editing snapshot, not a live mirror of the query cache.
  const [draft, setDraft] = useState(() => preferenceDraft(snapshot));
  const [feedback, setFeedback] = useState<"saved" | "refreshed" | null>(null);
  const saving = useRef(false);
  const save = useSportsCommand<
    NotificationPreferencesDto,
    NotificationPreferencesDto
  >("sports/community/preferences");
  const dirty = preferencesDirty(draft);
  const {
    button: refreshButton,
    retrying,
    run: refreshDraft,
  } = useQueryRetry(async () => {
    setFeedback(null);
    const result = await refresh();
    if (result.isSuccess && result.data) {
      setDraft((current) => refreshPreferenceDraft(current, result.data!));
      setFeedback("refreshed");
    }
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || retrying || refreshing || !dirty) return;
    saving.current = true;
    setFeedback(null);
    try {
      const confirmed = await save.mutateAsync(draft.values);
      setDraft(preferenceDraft(confirmed));
      setFeedback("saved");
    } catch {
      // Keep the draft; CommandError provides the recovery action.
    } finally {
      saving.current = false;
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-describedby={`${id}-scope`}
      className="flex flex-col gap-5"
    >
      <FieldDescription id={`${id}-scope`}>{t("notifyScope")}</FieldDescription>
      <ErrorNotice error={refreshError} />
      <FieldSet disabled={save.isPending}>
        <FieldLegend className="sr-only">{t("notifyPreferences")}</FieldLegend>
        <FieldGroup className="gap-0 luma-group">
          {notificationPreferenceKeys.map((key) => (
            <Field
              key={key}
              orientation="horizontal"
              className="min-h-16 border-b border-border last:border-0"
              data-disabled={save.isPending || undefined}
            >
              <FieldLabel
                htmlFor={`${id}-${key}`}
                className="min-h-12 flex-1 items-center"
              >
                {t(key)}
              </FieldLabel>
              <Checkbox
                id={`${id}-${key}`}
                name={key}
                checked={draft.values[key]}
                disabled={save.isPending}
                onCheckedChange={(checked) => {
                  setDraft((current) => ({
                    ...current,
                    values: { ...current.values, [key]: checked === true },
                  }));
                  setFeedback(null);
                  save.reset();
                }}
              />
            </Field>
          ))}
        </FieldGroup>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            ref={refreshButton}
            disabled={retrying || refreshing || save.isPending}
            aria-busy={retrying || refreshing}
            onClick={refreshDraft}
            className="min-h-11"
          >
            {t("notifyRefresh")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDraft(preferenceDraft(snapshot));
              setFeedback(null);
              save.reset();
            }}
            className="min-h-11"
          >
            {t("notifyDiscard")}
          </Button>
        </div>
        <Button
          type="submit"
          disabled={!dirty || save.isPending || retrying || refreshing}
          aria-busy={save.isPending}
          className="min-h-12 w-full"
        >
          {t(save.isPending ? "saving" : "save")}
        </Button>
      </FieldSet>
      {dirty && (
        <p role="status" className="luma-meta">
          {t("notifyUnsaved")}
        </p>
      )}
      <SuccessNotice
        success={feedback !== null}
        message={t(
          feedback === "saved" ? "notifyChangesSaved" : "notifyRefreshed",
        )}
      />
      <CommandError error={save.error} />
    </form>
  );
}
