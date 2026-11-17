"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import type { CoachRequest } from "@/features/coach-requests/api";

import { AuthForm } from "@/features/auth/AuthView";
import { readToken, subscribe, writeToken } from "@/features/auth/session";
import { coachRequestsHttp } from "@/features/coach-requests/api";
import { CoachRequestForm } from "@/features/coach-requests/CoachRequestForm";
import { ApiError } from "@repo/api/http";
import { ApiProvider, useQuery, useQueryClient } from "@repo/api/react-query";

const statusLabels = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  needs_changes: "نیاز به تکمیل",
};

const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });

const MyCoachRequests = (props: { token: string }) => {
  const { token } = props;
  const [editing, setEditing] = useState<string | null>(null);
  const [resubmitted, setResubmitted] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["coach-requests", token];
  const requests = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      coachRequestsHttp<CoachRequest[]>({
        url: "coach-requests",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }),
    retry: false,
  });

  function refresh() {
    setEditing(null);
    void requests.refetch();
  }

  if (requests.error instanceof ApiError && [401, 403].includes(requests.error.status ?? 0)) {
    return (
      <div>
        <p role="alert">نشست شما منقضی شده است.</p>
        <button className="underline" onClick={() => writeToken(null)}>
          ورود دوباره
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="coach-requests-title"
      className="space-y-4"
      aria-busy={requests.isFetching}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="coach-requests-title" className="font-semibold">
          درخواست‌های مربیگری
        </h2>
        <button
          className="underline disabled:opacity-50"
          disabled={requests.isFetching || editing !== null}
          onClick={refresh}
        >
          به‌روزرسانی
        </button>
      </div>
      {requests.isPending && <p role="status">در حال دریافت درخواست‌ها…</p>}
      {requests.isError && <p role="alert">دریافت درخواست‌ها ممکن نشد. دوباره تلاش کنید.</p>}
      {resubmitted && <p role="status">درخواست برای بررسی دوباره ارسال شد.</p>}
      {requests.data?.length === 0 && (
        <p>
          هنوز درخواست مربیگری ثبت نکرده‌اید.{" "}
          <Link href="/coach-registration/" className="underline">
            ثبت درخواست مربیگری
          </Link>
        </p>
      )}
      {requests.data?.map((entry) => (
        <article
          key={entry.id}
          className="space-y-4 rounded-2xl border border-theme-border bg-theme-card p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold" dir="auto">
              {entry.specialty}
            </h3>
            <span className="rounded-full bg-theme-background px-3 py-1 text-sm">
              {statusLabels[entry.status]}
            </span>
          </div>
          <div className="text-sm text-theme-muted-foreground">
            <p dir="auto">{entry.fullName}</p>
            <p>
              آخرین تغییر{" "}
              <time dateTime={entry.updatedAt}>{date.format(new Date(entry.updatedAt))}</time>
            </p>
          </div>
          {entry.reviewNote && (
            <div className="space-y-1 rounded-xl bg-theme-background p-3">
              <h4 className="font-medium">
                {entry.status === "rejected" ? "دلیل رد درخواست" : "مواردی که باید تکمیل کنید"}
              </h4>
              <p dir="auto" className="break-words whitespace-pre-wrap">
                {entry.reviewNote}
              </p>
            </div>
          )}
          {entry.status === "needs_changes" &&
            (editing === entry.id ?
              <CoachRequestForm
                key={entry.revision}
                token={token}
                entry={entry}
                onCancel={() => setEditing(null)}
                onConflict={refresh}
                onResubmit={async (updated) => {
                  await queryClient.cancelQueries({ queryKey });
                  queryClient.setQueryData<CoachRequest[]>(queryKey, (current) =>
                    current?.map((request) => (request.id === updated.id ? updated : request)),
                  );
                  setEditing(null);
                  setResubmitted(true);
                }}
              />
            : <button
                className="rounded-lg bg-theme-primary px-4 py-2 text-theme-primary-foreground"
                onClick={() => {
                  setResubmitted(false);
                  setEditing(entry.id);
                }}
              >
                اصلاح درخواست
              </button>)}
        </article>
      ))}
    </section>
  );
};

const MyRequestsPage = () => {
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header dir="rtl" lang="fa" className="space-y-2">
        <Link href="/" className="text-sm underline">
          صفحه اصلی
        </Link>
        <h1 className="text-2xl font-bold">درخواست‌های من</h1>
        {!token && <p>برای دیدن درخواست‌ها، با شماره موبایلی که با آن ثبت‌نام کردید وارد شوید.</p>}
      </header>
      <ApiProvider>
        {token ?
          <div dir="rtl" lang="fa">
            <MyCoachRequests key={token} token={token} />
          </div>
        : <div dir="rtl" lang="fa">
            <AuthForm locale="fa" />
          </div>
        }
      </ApiProvider>
    </main>
  );
};

export default MyRequestsPage;
