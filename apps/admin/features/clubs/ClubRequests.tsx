"use client";

import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { ReviewProfile } from "./ClubReviewProfile";
import type { ColumnDef } from "@tanstack/react-table";
import type { FormEvent } from "react";

import { getLocaleConfig, useFormatter, useLocale, useTranslations } from "@repo/i18n";
import { CheckCircle } from "@repo/icons/check-circle";
import { ChevronDown } from "@repo/icons/chevron-down";
import { Clock } from "@repo/icons/clock";
import { CloseX } from "@repo/icons/close-x";
import { CloseXCircle } from "@repo/icons/close-x-circle";
import { DocumentFold } from "@repo/icons/document-fold";
import { MagnifyingGlass } from "@repo/icons/magnifying-glass";
import { Badge } from "@repo/ui/kit/badge";
import { AnimatedButton as Button } from "@repo/ui/kit/button";
import {
  AnimatedDrawer as Drawer,
  AnimatedDrawerBody as DrawerBody,
  AnimatedDrawerClose as DrawerClose,
  AnimatedDrawerContent as DrawerContent,
  AnimatedDrawerDescription as DrawerDescription,
  AnimatedDrawerFooter as DrawerFooter,
  AnimatedDrawerHeader as DrawerHeader,
  AnimatedDrawerTitle as DrawerTitle,
} from "@repo/ui/kit/drawer";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import {
  AnimatedSelect as Select,
  AnimatedSelectGroup as SelectGroup,
  AnimatedSelectIcon as SelectIcon,
  AnimatedSelectItem as SelectItem,
  AnimatedSelectItemIndicator as SelectItemIndicator,
  AnimatedSelectItemText as SelectItemText,
  AnimatedSelectList as SelectList,
  AnimatedSelectPopup as SelectPopup,
  AnimatedSelectPortal as SelectPortal,
  AnimatedSelectPositioner as SelectPositioner,
  AnimatedSelectTrigger as SelectTrigger,
  AnimatedSelectValue as SelectValue,
} from "@repo/ui/kit/select";
import { Textarea } from "@repo/ui/kit/textarea";

import { readApi, useApiRequest } from "../../lib/admin-api";
import { normalizeDigits } from "../../lib/phone";
import { clubRequestName } from "./club-request-name";
import { ClubLocationActions, ClubReviewProfile } from "./ClubReviewProfile";

const statuses = ["pending", "approved", "rejected"] as const;
type Status = (typeof statuses)[number];
type Filter = "all" | Status;
type Decision = Exclude<Status, "pending">;
type Entry = {
  id: string;
  profile: ReviewProfile;
  revision?: number;
  submittedAt: string;
  publishedAt?: string | null;
  status: Status;
  phone: string;
  rejectionReason: string | null;
};

export type ApiEntry = Omit<Entry, "profile"> & {
  profile: Omit<ReviewProfile, "name"> & { name?: string | null; title?: string | null };
};

const tones = {
  all: "bg-theme-primary/10 text-theme-primary",
  pending: "bg-theme-warning/10 text-theme-warning",
  approved: "bg-theme-success/10 text-theme-success",
  rejected: "bg-theme-error/10 text-theme-error",
};
const filters = ["all", ...statuses] as const;
const surface = "rounded-2xl border border-theme-border bg-theme-card";
const statusIcons = {
  all: DocumentFold,
  pending: Clock,
  approved: CheckCircle,
  rejected: CloseXCircle,
};
const pageSize = 8;
const emptyEntries: Entry[] = [];
const columns: ColumnDef<Entry>[] = [
  {
    id: "name",
    accessorFn: (entry) => entry.profile.name,
    filterFn: ({ original }, _column, query: string) =>
      [original.profile.name, original.phone ?? ""].some((value) =>
        normalizeDigits(value).toLowerCase().includes(query),
      ),
  },
  { accessorKey: "status", filterFn: "equalsString" },
];

function normalizeEntries(entries: ApiEntry[]): Entry[] {
  return entries.map((entry) => ({
    ...entry,
    profile: { ...entry.profile, name: clubRequestName(entry.profile) },
  }));
}

export const ClubRequests = ({ publication = false }: { publication?: boolean }) => {
  const endpoint = publication ? "/api/club-publications" : "/api/club-requests";
  const t = useTranslations("ClubRequests");
  const locale = useLocale();
  const format = useFormatter();
  const client = useQueryClient();
  const toast = Toast.useToastManager();
  const request = useApiRequest();
  const queryKey = ["admin", endpoint];
  const records = useQuery({
    queryKey,
    queryFn: async ({ signal }) => normalizeEntries(await readApi<ApiEntry[]>(endpoint, signal)),
  });
  const entries = records.data;
  const [reviewError, setError] = useState<"saveError" | "conflict" | "reasonRequired">();
  const error = reviewError ?? (records.isError ? "loadError" : undefined);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<{ id: string; decision: Decision }>();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const localeConfig = getLocaleConfig(locale);

  const reviewForm = useForm({
    resolver: zodResolver(z.object({ reason: z.string().trim().max(1200) })),
    defaultValues: { reason: "" },
  });
  async function review(event: FormEvent<HTMLFormElement>, entry: Entry) {
    event.preventDefault();
    if (pending || entry.status !== "pending") return;
    const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (decision !== "approved" && decision !== "rejected") return;
    if (decision === "approved" && publication && !entry.profile.clubTypeId) return;
    await reviewForm.handleSubmit(async ({ reason }) => {
      setSaved(false);
      if (decision === "rejected" && !reason) return setError("reasonRequired");

      setPending({ id: entry.id, decision });
      setError(undefined);
      try {
        const response = await request([
          endpoint + "/" + entry.id,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: decision, reason, revision: entry.revision }),
          },
        ]);
        if (response.status === 409) {
          setError("conflict");
          toast.add({ title: t("conflict"), type: "error" });
          await records.refetch();
          return;
        }
        if (!response.ok) throw new Error();
        await client.cancelQueries({ queryKey });
        client.setQueryData<Entry[]>(queryKey, (current) =>
          current?.map((item) =>
            item.id === entry.id ?
              {
                ...item,
                status: decision,
                rejectionReason: decision === "rejected" ? reason : null,
              }
            : item,
          ),
        );
        setSaved(true);
        void client.invalidateQueries({ queryKey });
      } catch {
        setError("saveError");
        toast.add({ title: t("saveError"), type: "error" });
      } finally {
        setPending(undefined);
      }
    })(event);
  }

  const all = entries ?? emptyEntries;
  const query = normalizeDigits(search.trim()).toLowerCase();
  const columnFilters = useMemo(
    () => [
      ...(query ? [{ id: "name", value: query }] : []),
      ...(filter !== "all" ? [{ id: "status", value: filter }] : []),
    ],
    [query, filter],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- The table is read directly on each render.
  const table = useReactTable({
    data: all,
    columns,
    getRowId: (entry) => entry.id,
    state: { columnFilters },
    initialState: { pagination: { pageIndex: 0, pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const filteredCount = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const { pageIndex } = table.getState().pagination;
  const offset = pageIndex * pageSize;
  const selected = openId ? table.getCoreRowModel().rowsById[openId]?.original : undefined;
  const options = filters.map((value) => ({ value, label: t(value) }));

  return (
    <main
      {...localeConfig}
      className="mx-auto grid w-full max-w-[96rem] gap-6 px-4 py-8 [--theme-color-border:var(--theme-ref-neutral-800)] [--theme-color-card:color-mix(in_srgb,var(--theme-ref-neutral-900)_65%,var(--theme-ref-black))] [--theme-color-muted:var(--theme-ref-neutral-850)] [--theme-color-secondary:var(--theme-ref-neutral-850)] sm:px-7 lg:px-10"
    >
      <header className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-semibold">
            {t(publication ? "publication" : "title")}
          </h1>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-theme-muted-foreground">
            <Link className="hover:text-theme-foreground" href="/coach-requests">
              {t("coaches")}
            </Link>
            <Link className="hover:text-theme-foreground" href="/club/resources">
              {t("resources")}
            </Link>
          </nav>
        </div>
      </header>
      <div role="group" aria-label={t("status")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {filters.map((item) => {
          const Icon = statusIcons[item];
          const count =
            item === "all" ? all.length : all.filter(({ status }) => status === item).length;
          return (
            <Button
              key={item}
              type="button"
              variant="text"
              color="neutral"
              fullWidth
              aria-pressed={filter === item}
              onClick={() => {
                setFilter(item);
                table.setPageIndex(0);
                setOpenId(undefined);
              }}
              className={`${surface} h-auto min-h-20 justify-start gap-3 p-3 text-start transition-colors hover:bg-theme-secondary aria-pressed:border-theme-primary/55 sm:p-4`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg sm:size-10 ${tones[item]}`}
              >
                <Icon size={18} aria-hidden />
              </span>
              <span className="grid gap-1">
                <strong className="text-2xl leading-none font-semibold tabular-nums">
                  {entries ? format.number(count) : "—"}
                </strong>
                <span className="text-xs text-theme-muted-foreground">{t(item)}</span>
              </span>
            </Button>
          );
        })}
      </div>
      <section className={`${surface} min-w-0`} aria-labelledby="requests-heading">
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="requests-heading" className="text-base font-semibold">
                {t(filter)}
              </h2>
              {entries && (
                <p className="mt-1 text-xs text-theme-muted-foreground">
                  {t("count", { count: filteredCount })}
                </p>
              )}
            </div>
            <Select<Filter>
              items={options}
              value={filter}
              onValueChange={(value) => {
                setFilter(value ?? "all");
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger aria-label={t("status")} className="min-w-0">
                <SelectValue />
                <SelectIcon>
                  <ChevronDown size={16} aria-hidden />
                </SelectIcon>
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner sideOffset={8} alignItemWithTrigger={false}>
                  <SelectPopup
                    {...localeConfig}
                    className="[--theme-color-border:var(--theme-ref-neutral-800)] [--theme-color-popover:var(--theme-ref-neutral-900)]"
                  >
                    <SelectList>
                      <SelectGroup>
                        {options.map(({ value, label }) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="[--theme-color-primary-foreground:var(--theme-ref-neutral-50)] [--theme-color-primary:var(--theme-ref-neutral-800)]"
                          >
                            <SelectItemText>{label}</SelectItemText>
                            <SelectItemIndicator className="text-[color:var(--theme-ref-lime)]" />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectList>
                  </SelectPopup>
                </SelectPositioner>
              </SelectPortal>
            </Select>
          </div>
          <div className="relative">
            <MagnifyingGlass
              size={18}
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-theme-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              placeholder={t("search")}
              aria-label={t("search")}
              className="w-full rounded-lg bg-theme-background ps-10"
              onChange={(event) => {
                setSearch(event.target.value);
                table.setPageIndex(0);
                setOpenId(undefined);
              }}
            />
          </div>
          {records.isPending && (
            <p role="status" aria-busy="true">
              …
            </p>
          )}
          {records.isError && (
            <Button size="sm" variant="outlined" onClick={() => void records.refetch()}>
              {locale === "fa" ? "تلاش دوباره" : "Try again"}
            </Button>
          )}
          {error && !drawerOpen && (
            <p role="alert" className="text-sm text-theme-error">
              {t(error)}
            </p>
          )}
          {saved && !drawerOpen && (
            <p role="status" className="text-sm text-theme-success">
              {t("saved")}
            </p>
          )}
        </div>
        <div aria-busy={Boolean(pending)}>
          {entries && !rows.length && (
            <p className="px-5 pb-5 text-theme-muted-foreground">
              {t(all.length ? "noMatches" : "empty")}
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm [&_td]:px-3 [&_td]:py-4 sm:[&_td]:px-5 [&_th]:px-3 [&_th]:py-3 [&_th]:text-start sm:[&_th]:px-5">
                <thead className="border-y border-theme-border bg-theme-muted text-xs text-theme-muted-foreground">
                  <tr>
                    {(["name", "type", "status", "date", "actions"] as const).map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className={
                          column === "type" || column === "date" ?
                            "hidden md:table-cell"
                          : undefined
                        }
                      >
                        {t(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ original: entry }) => {
                    const { id, profile, phone, status, submittedAt } = entry;
                    const type =
                      (profile.clubTypeId && profile.labels?.[profile.clubTypeId]) || profile.type;
                    const date =
                      submittedAt &&
                      format.dateTime(new Date(submittedAt), { dateStyle: "medium" });
                    return (
                      <tr
                        key={id}
                        className="border-t border-theme-border transition-colors hover:bg-theme-background/40"
                      >
                        <th scope="row" className="py-4 font-normal">
                          <bdi className="block font-semibold break-words">
                            {profile.name || "—"}
                          </bdi>
                          <bdi dir="ltr" className="text-xs text-theme-muted-foreground">
                            {phone}
                          </bdi>
                          <span className="mt-1 block text-xs text-theme-muted-foreground md:hidden">
                            {[type, date].filter(Boolean).join(" · ")}
                          </span>
                        </th>
                        <td className="hidden text-theme-muted-foreground md:table-cell">
                          <bdi>{type || "—"}</bdi>
                        </td>
                        <td>
                          <Badge
                            size="xs"
                            radius="full"
                            variant="text"
                            color={
                              status === "approved" ? "success"
                              : status === "rejected" ?
                                "error"
                              : "warning"
                            }
                          >
                            {t(status)}
                          </Badge>
                        </td>
                        <td className="hidden whitespace-nowrap text-theme-muted-foreground md:table-cell">
                          {date ?
                            <time dateTime={submittedAt}>{date}</time>
                          : "—"}
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="outlined"
                            size="sm"
                            color="neutral"
                            aria-haspopup="dialog"
                            onClick={(event) => {
                              detailsTrigger.current = event.currentTarget;
                              setError(undefined);
                              setSaved(false);
                              reviewForm.reset();
                              setOpenId(id);
                              setDrawerOpen(true);
                            }}
                          >
                            {t("details")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-theme-border p-4">
            <p className="text-sm text-theme-muted-foreground">
              {t("range", { start: offset + 1, end: offset + rows.length, count: filteredCount })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="text"
                color="neutral"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                {t("previous")}
              </Button>
              <span
                className="rounded-lg bg-theme-background px-3 py-1 tabular-nums"
                aria-current="page"
              >
                {format.number(pageIndex + 1)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="text"
                color="neutral"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                {t("next")}
              </Button>
            </div>
          </footer>
        )}
      </section>
      <Drawer
        open={drawerOpen && Boolean(selected)}
        swipeDirection={localeConfig.dir === "rtl" ? "right" : "left"}
        onOpenChange={(open, event) => {
          if (!open && pending) {
            event.cancel();
            return;
          }
          setDrawerOpen(open);
        }}
      >
        {selected &&
          (() => {
            const { id, profile, status, publishedAt, rejectionReason } = selected;
            return (
              <DrawerContent
                key={id}
                {...localeConfig}
                finalFocus={detailsTrigger}
                overlayProps={{ className: "bg-[color:var(--theme-ref-black)]/65" }}
                className="gap-0 p-0 shadow-none [--theme-color-background:var(--theme-ref-neutral-900)] [--theme-color-border:var(--theme-ref-neutral-800)] [--theme-color-muted:var(--theme-ref-neutral-850)]"
              >
                <DrawerHeader className="shrink-0 border-b border-theme-border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <DrawerTitle className="min-w-0 break-words">
                      <bdi>{profile.name || t("details")}</bdi>
                    </DrawerTitle>
                    <DrawerClose
                      aria-label={t("close")}
                      title={t("close")}
                      disabled={Boolean(pending)}
                      className="size-10 shrink-0 border border-theme-border"
                    >
                      <CloseX size={18} aria-hidden />
                    </DrawerClose>
                  </div>
                  <DrawerDescription>
                    <Badge
                      size="xs"
                      radius="full"
                      variant="text"
                      color={
                        status === "approved" ? "success"
                        : status === "rejected" ?
                          "error"
                        : "warning"
                      }
                    >
                      {t(status)}
                    </Badge>
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerBody className="p-5">
                  <article className="grid gap-4">
                    {error && (
                      <p role="alert" className="text-sm text-theme-error">
                        {t(error)}
                      </p>
                    )}
                    {saved && (
                      <p role="status" className="text-sm text-theme-success">
                        {t("saved")}
                      </p>
                    )}
                    <ClubReviewProfile profile={profile} clubId={publication ? id : undefined} />
                    {publishedAt && status !== "approved" && <p>{t("previousLive")}</p>}
                    {publication && !profile.clubTypeId && <p>{t("incomplete")}</p>}
                    {rejectionReason && (
                      <p>
                        {t("reason")} · {rejectionReason}
                      </p>
                    )}
                    {status === "pending" && (
                      <form
                        id="club-review-form"
                        className="grid gap-3"
                        onSubmit={(event) => void review(event, selected)}
                      >
                        <FieldGroup>
                          <Field
                            data-invalid={
                              error === "reasonRequired" ||
                              Boolean(reviewForm.formState.errors.reason)
                            }
                          >
                            <FieldLabel htmlFor="club-review-reason">{t("reason")}</FieldLabel>
                            <Textarea
                              id="club-review-reason"
                              {...reviewForm.register("reason")}
                              rows={2}
                              maxLength={1200}
                              aria-invalid={
                                error === "reasonRequired" ||
                                Boolean(reviewForm.formState.errors.reason)
                              }
                              disabled={Boolean(pending)}
                            />
                          </Field>
                        </FieldGroup>
                      </form>
                    )}
                  </article>
                </DrawerBody>
                <DrawerFooter className="shrink-0 gap-3 border-t border-theme-border p-5">
                  <ClubLocationActions location={profile.location} />
                  {status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        form="club-review-form"
                        disabled={Boolean(pending) || (publication && !profile.clubTypeId)}
                        loading={pending?.id === id && pending.decision === "approved"}
                        value="approved"
                      >
                        {t(publication ? "publish" : "approve")}
                      </Button>
                      <Button
                        type="submit"
                        form="club-review-form"
                        variant="outlined"
                        color="neutral"
                        disabled={Boolean(pending)}
                        loading={pending?.id === id && pending.decision === "rejected"}
                        value="rejected"
                      >
                        {t("reject")}
                      </Button>
                    </div>
                  )}
                  <DrawerClose disabled={Boolean(pending)} className="w-fit px-3">
                    {t("close")}
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            );
          })()}
      </Drawer>
    </main>
  );
};
