"use client";
import { IranianDateInput } from "../kit/IranianDateInput";
import { useId, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { FilterSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { useListState } from "../hooks/use-list-state";
import { TextField } from "../account/common";

export type ManagementFilters = {
  search?: string;
  status?: string;
  kind?: string;
  from?: string;
  to?: string;
  sort: string;
  page: number;
};
const initial: ManagementFilters = { sort: "newest", page: 1 };
function isManagementFilters(value: unknown): value is ManagementFilters {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    (f.sort === "newest" || f.sort === "oldest") &&
    Number.isInteger(f.page) &&
    Number(f.page) > 0 &&
    ["search", "status", "kind", "from", "to"].every(
      (key) => f[key] === undefined || typeof f[key] === "string",
    )
  );
}
export function useManagementFilters(listId: string, scope = "") {
  const [filters, set] = useListState(
    `management:${listId}`,
    initial,
    isManagementFilters,
    scope,
  );
  return {
    filters,
    apply: (f: ManagementFilters) => set({ ...f, page: 1 }),
    page: (page: number) => set((f) => ({ ...f, page })),
  };
}
export function ManagementFilterBar({
  value,
  onApply,
  statuses = [],
  kinds = false,
}: {
  value: ManagementFilters;
  onApply: (value: ManagementFilters) => void;
  statuses?: string[];
  kinds?: boolean;
}) {
  const t = useTranslations("Analytics"),
    luma = useTranslations("Luma"),
    id = useId();
  const [draft, set] = useState(value);
  const valid =
    !draft.from ||
    !draft.to ||
    (draft.to >= draft.from &&
      Date.parse(draft.to) - Date.parse(draft.from) <= 730 * 86400000);
  return (
    <FilterSheet
      count={
        [
          value.search,
          value.status,
          value.kind,
          value.from,
          value.to,
          value.sort !== "newest",
        ].filter(Boolean).length
      }
      onOpen={() => set(value)}
    >
      <form
        className="management-filters mb-5 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onApply(draft);
        }}
      >
        <TextField
          name={`${id}-search`}
          type="search"
          label={t("search")}
          value={draft.search ?? ""}
          maxLength={100}
          onChange={(e) =>
            set((d) => ({ ...d, search: e.target.value || undefined }))
          }
        />
        {statuses.length > 0 && (
          <label className="grid gap-2 text-sm">
            {t("status")}
            <NativeSelect
              value={draft.status ?? ""}
              onChange={(e) =>
                set((d) => ({ ...d, status: e.target.value || undefined }))
              }
            >
              <NativeSelectOption value="">{t("all")}</NativeSelectOption>
              {statuses.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {luma.has(`status.${s}` as Parameters<typeof luma>[0])
                    ? luma(`status.${s}` as Parameters<typeof luma>[0])
                    : t.has(`state.${s}` as Parameters<typeof t>[0])
                      ? t(`state.${s}` as Parameters<typeof t>[0])
                      : s}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
        {kinds && (
          <label className="grid gap-2 text-sm">
            {t("kind")}
            <NativeSelect
              value={draft.kind ?? ""}
              onChange={(e) =>
                set((d) => ({ ...d, kind: e.target.value || undefined }))
              }
            >
              <NativeSelectOption value="">{t("all")}</NativeSelectOption>
              {(
                [
                  "class",
                  "course",
                  "court",
                  "access",
                  "membership",
                  "program",
                ] as const
              ).map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {luma(`kinds.${k}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
        <label className="grid gap-2 text-sm">
          {t("from")}
          <IranianDateInput
            name={`${id}-from`}
            value={draft.from ?? ""}
            max={draft.to}
            onValueChange={(iso) =>
              set((d) => ({ ...d, from: iso || undefined }))
            }
          />
        </label>
        <label className="grid gap-2 text-sm">
          {t("to")}
          <IranianDateInput
            name={`${id}-to`}
            value={draft.to ?? ""}
            min={draft.from}
            onValueChange={(iso) =>
              set((d) => ({ ...d, to: iso || undefined }))
            }
          />
        </label>
        <label className="grid gap-2 text-sm">
          {t("sort")}
          <NativeSelect
            value={draft.sort}
            onChange={(e) => set((d) => ({ ...d, sort: e.target.value }))}
          >
            {(["newest", "oldest"] as const).map((v) => (
              <NativeSelectOption key={v} value={v}>
                {t(v)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" disabled={!valid}>
            {t("apply")}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              set(initial);
              onApply(initial);
            }}
          >
            {t("reset")}
          </Button>
        </div>
        {!valid && (
          <p role="alert" className="text-sm text-destructive">
            {t("invalidRange")}
          </p>
        )}
      </form>
    </FilterSheet>
  );
}
