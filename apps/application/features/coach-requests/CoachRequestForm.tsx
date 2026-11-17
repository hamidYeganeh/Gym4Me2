"use client";

import Link from "next/link";
import { useState } from "react";

import type { CoachRequest } from "./api";
import type { FormEvent } from "react";

import { writeToken } from "@/features/auth/session";
import { ApiError } from "@repo/api/http";
import { useMutation } from "@repo/api/react-query";

import { coachRequestsHttp } from "./api";

const field = "mt-1 block w-full rounded-lg border border-current/30 bg-transparent p-2";
const action =
  "rounded-lg bg-theme-primary px-4 py-2 text-theme-primary-foreground disabled:opacity-50";

export const CoachRequestForm = (props: {
  token: string;
  entry?: CoachRequest;
  onResubmit?: (entry: CoachRequest) => Promise<void>;
  onConflict?: () => void;
  onCancel?: () => void;
}) => {
  const { token, entry, onResubmit, onConflict, onCancel } = props;
  const [expired, setExpired] = useState(false);
  const submission = useMutation({
    mutationFn: (data: Record<string, FormDataEntryValue>) =>
      coachRequestsHttp<CoachRequest>({
        url: entry ? `coach-requests/${entry.id}` : "coach-requests",
        method: entry ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        data: entry ? { ...data, revision: entry.revision } : data,
      }),
    onSuccess: (updated) => {
      if (entry) return onResubmit?.(updated);
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setExpired(true);
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.isPending || submission.isSuccess || expired) return;
    submission.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  }

  if (!entry && submission.isSuccess) {
    return (
      <>
        <p role="status">درخواست مربیگری برای ادمین ارسال شد.</p>
        <Link href="/my-requests/" className="underline">
          مشاهده درخواست‌های من
        </Link>
      </>
    );
  }

  return (
    <form method="post" className="space-y-4" onSubmit={submit}>
      <label className="block">
        نام و نام خانوادگی
        <input
          className={field}
          name="fullName"
          defaultValue={entry?.fullName}
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
      </label>
      <label className="block">
        رشته ورزشی یا تخصص
        <input
          className={field}
          name="specialty"
          defaultValue={entry?.specialty}
          minLength={2}
          maxLength={120}
          required
        />
      </label>
      <label className="block">
        سابقه مربیگری و مدارک
        <textarea
          className={field}
          name="experience"
          defaultValue={entry?.experience}
          rows={5}
          minLength={2}
          maxLength={1200}
          required
        />
      </label>
      {submission.isError && (
        <p role="alert">
          {expired ?
            "نشست شما منقضی شده است. دوباره وارد شوید."
          : submission.error instanceof ApiError && submission.error.status === 409 ?
            "وضعیت درخواست تغییر کرده است. فهرست را به‌روز کنید."
          : submission.error instanceof ApiError && submission.error.status === 400 ?
            "اطلاعات واردشده را بررسی کنید."
          : "ارسال درخواست انجام نشد. دوباره تلاش کنید."}
        </p>
      )}
      {onCancel && (
        <button
          type="button"
          className="me-3 underline"
          onClick={onCancel}
          disabled={submission.isPending}
        >
          انصراف
        </button>
      )}
      {expired ?
        <button type="button" className={action} onClick={() => writeToken(null)}>
          ورود دوباره
        </button>
      : submission.error instanceof ApiError && submission.error.status === 409 ?
        <button type="button" className={action} onClick={onConflict}>
          به‌روزرسانی درخواست‌ها
        </button>
      : <button className={action} disabled={submission.isPending}>
          {submission.isPending ?
            "در حال ارسال…"
          : entry ?
            "ارسال دوباره برای بررسی"
          : "ارسال درخواست"}
        </button>
      }
    </form>
  );
};
