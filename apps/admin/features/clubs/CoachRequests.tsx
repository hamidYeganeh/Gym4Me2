"use client";

import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { getLocaleConfig, useLocale } from "@repo/i18n";
import { Badge } from "@repo/ui/kit/badge";
import { AnimatedButton as Button } from "@repo/ui/kit/button";
import {
  AnimatedDrawer as Drawer,
  AnimatedDrawerBody as DrawerBody,
  AnimatedDrawerClose as DrawerClose,
  AnimatedDrawerContent as DrawerContent,
  AnimatedDrawerHeader as DrawerHeader,
  AnimatedDrawerTitle as DrawerTitle,
} from "@repo/ui/kit/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { AnimatedSelectControl } from "@repo/ui/kit/select";
import { Textarea } from "@repo/ui/kit/textarea";

import { readApi, useApiRequest } from "../../lib/admin-api";
import { ListFilters, ListPagination, useAdminList } from "../../lib/ListControls";
import { clubClasses } from "./club-classes";

type Entry = {
  id: string;
  fullName: string;
  specialty: string;
  experience: string;
  phone: string;
  updatedAt: string;
  status: "pending" | "approved" | "rejected" | "needs_changes";
  reviewNote: string | null;
  revision: number;
};

const labels = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  needs_changes: "Returned for changes",
};

const ReviewForm = (props: {
  entry: Entry;
  onUpdate: (entry: Entry) => void;
  onConflict: () => void;
}) => {
  const { entry, onUpdate, onConflict } = props;
  const request = useApiRequest();
  const toast = Toast.useToastManager();
  const schema = z
    .object({
      decision: z.enum(["", "approved", "rejected", "needs_changes"]),
      note: z.string().trim().max(1200),
    })
    .superRefine(({ decision, note }, ctx) => {
      if (!decision)
        ctx.addIssue({ code: "custom", path: ["decision"], message: "Choose a decision." });
      if (decision && decision !== "approved" && !note)
        ctx.addIssue({
          code: "custom",
          path: ["note"],
          message: "Enter a message for the applicant.",
        });
    });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { decision: "", note: "" },
  });
  const decision = useWatch({ control: form.control, name: "decision" });
  const { errors } = form.formState;
  const [busy, setBusy] = useState(false);

  const review = form.handleSubmit(async ({ decision, note }) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await request([
        `/api/coach-requests/${entry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: decision, note, revision: entry.revision }),
        },
      ]);
      if (response.status === 409) {
        onConflict();
        return;
      }
      if (!response.ok) throw new Error();
      const updated = (await response.json()) as Omit<Entry, "phone">;
      onUpdate({ ...updated, phone: entry.phone });
    } catch {
      toast.add({ title: "Could not save your decision. Try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  });

  return (
    <form onSubmit={(event) => void review(event)} noValidate>
      <fieldset disabled={busy}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.decision)}>
            <FieldLabel htmlFor={`decision-${entry.id}`}>Review decision</FieldLabel>
            <Controller
              name="decision"
              control={form.control}
              render={({ field }) => (
                <AnimatedSelectControl
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose a decision"
                  items={[
                    { value: "", label: "Choose a decision" },
                    { value: "approved", label: "Approve request" },
                    { value: "rejected", label: "Reject request" },
                    { value: "needs_changes", label: "Return for changes" },
                  ]}
                  triggerProps={{
                    id: `decision-${entry.id}`,
                    ref: field.ref,
                    onBlur: field.onBlur,
                    "aria-invalid": Boolean(errors.decision),
                  }}
                />
              )}
            />
            {errors.decision && (
              <FieldDescription role="alert">{errors.decision.message}</FieldDescription>
            )}
          </Field>
          {decision && decision !== "approved" && (
            <Field data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor={`note-${entry.id}`}>Message to applicant</FieldLabel>
              <Textarea
                id={`note-${entry.id}`}
                {...form.register("note")}
                rows={3}
                maxLength={1200}
                aria-invalid={Boolean(errors.note)}
              />
              {errors.note && (
                <FieldDescription role="alert">{errors.note.message}</FieldDescription>
              )}
            </Field>
          )}
          <Button className={clubClasses.primary} disabled={!decision} loading={busy} type="submit">
            Save decision
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
};

export const CoachRequests = () => {
  const locale = useLocale();
  const localeConfig = getLocaleConfig(locale);
  const fa = locale === "fa";
  const statuses =
    fa ?
      {
        pending: "در انتظار بررسی",
        approved: "تأیید شده",
        rejected: "رد شده",
        needs_changes: "نیازمند اصلاح",
      }
    : labels;
  const [selectedId, setSelectedId] = useState<string>();
  const client = useQueryClient();
  const toast = Toast.useToastManager();
  const queryKey = ["admin", "/api/coach-requests"];
  const records = useQuery({
    queryKey,
    queryFn: ({ signal }) => readApi<Entry[]>("/api/coach-requests", signal),
  });
  const entries = records.data ?? [];
  const selected = entries.find((entry) => entry.id === selectedId);
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Asia/Tehran",
  });
  const list = useAdminList(
    entries,
    (entry) => `${entry.fullName} ${entry.phone} ${entry.specialty}`,
    (entry) => entry.status,
  );
  function update(updated: Entry) {
    void client.invalidateQueries({ queryKey });
    client.setQueryData<Entry[]>(queryKey, (current = []) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    toast.add({ title: fa ? "تصمیم ثبت شد" : "Decision saved." });
    setSelectedId(undefined);
  }

  function refreshAfterConflict() {
    toast.add({
      title: "This request changed. Review the latest version before saving a decision.",
      type: "error",
    });
    void records.refetch();
  }

  return (
    <main className={`${clubClasses.container} space-y-4`}>
      <header className={clubClasses.headingRow}>
        <h1>{fa ? "درخواست‌های مربیان" : "Coach requests"}</h1>
        <Link className={clubClasses.action} href="/club">
          {fa ? "درخواست‌های باشگاه" : "Club requests"}
        </Link>
      </header>
      {records.isError && (
        <p role="alert">
          {fa ? "دریافت درخواست‌های مربیان ممکن نشد." : "Could not load coach requests."}{" "}
          <Button loading={records.isFetching} onClick={() => void records.refetch()}>
            {fa ? "تلاش دوباره" : "Try again"}
          </Button>
        </p>
      )}
      {records.isPending && (
        <p role="status">{fa ? "در حال دریافت درخواست‌ها…" : "Loading requests…"}</p>
      )}
      {records.isSuccess && <ListFilters list={list} options={Object.entries(statuses)} />}
      {records.isSuccess && list.count === 0 && (
        <p>
          {fa ?
            entries.length ?
              "درخواستی مطابق فیلترها پیدا نشد"
            : "هنوز درخواستی ثبت نشده است"
          : entries.length ?
            "No matching requests."
          : "No coach requests yet."}
        </p>
      )}
      {list.rows.map((entry) => (
        <article key={entry.id} className={clubClasses.form}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 dir="auto">{entry.fullName}</h2>
            <Badge
              size="xs"
              variant="text"
              color={
                entry.status === "approved" ? "success"
                : entry.status === "rejected" ?
                  "error"
                : "warning"
              }
            >
              {statuses[entry.status]}
            </Badge>
          </div>
          <p>
            <bdi>{entry.phone}</bdi> ·{" "}
            <time dateTime={entry.updatedAt}>{formatDate.format(new Date(entry.updatedAt))}</time>
          </p>
          <p dir="auto">{entry.specialty}</p>
          <p dir="auto" className="break-words whitespace-pre-wrap">
            {entry.experience}
          </p>
          {entry.reviewNote && (
            <div>
              <h3 className="font-semibold">Message to applicant</h3>
              <p dir="auto" className="break-words whitespace-pre-wrap">
                {entry.reviewNote}
              </p>
            </div>
          )}
          {entry.status === "pending" && (
            <Button
              variant="outlined"
              color="neutral"
              size="sm"
              onClick={() => setSelectedId(entry.id)}
            >
              {fa ? "بررسی درخواست" : "Review request"}
            </Button>
          )}
        </article>
      ))}
      {records.isSuccess && <ListPagination list={list} />}
      <Drawer
        open={Boolean(selected)}
        swipeDirection={fa ? "right" : "left"}
        onOpenChange={(open) => {
          if (!open) setSelectedId(undefined);
        }}
      >
        {selected && (
          <DrawerContent {...localeConfig}>
            <DrawerHeader>
              <DrawerTitle>
                <bdi>{selected.fullName}</bdi>
              </DrawerTitle>
              <DrawerClose>{fa ? "بستن" : "Close"}</DrawerClose>
            </DrawerHeader>
            <DrawerBody>
              {selected.status === "pending" ?
                <ReviewForm
                  key={selected.id + ":" + selected.revision}
                  entry={selected}
                  onUpdate={update}
                  onConflict={refreshAfterConflict}
                />
              : <p>{statuses[selected.status]}</p>}
            </DrawerBody>
          </DrawerContent>
        )}
      </Drawer>
    </main>
  );
};
