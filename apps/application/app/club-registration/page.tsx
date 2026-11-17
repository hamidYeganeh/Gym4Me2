"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { FormEvent } from "react";

import { AuthForm } from "@/features/auth/AuthView";
import { readToken, subscribe, writeToken } from "@/features/auth/session";
import { ApiProvider } from "@repo/api/react-query";
import {
  ClubLocationFields,
  emptyClubLocation,
  useClubResources,
} from "@repo/ui/lib/club-location-fields";

const origin = process.env.NEXT_PUBLIC_CLUB_API_ORIGIN ?? "http://localhost:3003";
const business = process.env.NEXT_PUBLIC_BUSINESS_PANEL_URL ?? "http://localhost:3002";
const catalogs = [
  "types/club_types",
  "locations/provinces",
  "locations/cities",
  "locations/districts",
  "locations/neighborhoods",
] as const;
const statuses = { pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده" };
type Entry = {
  id: string;
  profile: { name: string };
  status: keyof typeof statuses;
  rejectionReason: string | null;
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function api(path: string, body?: unknown, token?: string, signal?: AbortSignal) {
  const headers = new Headers();
  if (body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  const response = await fetch(new URL("/api/v1/applicant/" + path, origin), {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "اطلاعات واردشده را بررسی کنید.",
      401: "نشست منقضی شده است.",
      429: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
    };
    throw new ApiError(
      messages[response.status] ?? "سرویس در دسترس نیست. دوباره تلاش کنید.",
      response.status,
    );
  }
  return response;
}

const ClubRequestForm = ({ token }: { token: string }) => {
  const { resources, error: resourcesError } = useClubResources(
    new URL("/api/v1/resources", origin).href,
    catalogs,
  );
  const [location, setLocation] = useState(emptyClubLocation);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api("club-requests", undefined, token, controller.signal)
      .then(async (response) => {
        const requests = (await response.json()) as Entry[];
        if (!controller.signal.aborted) setEntries(requests);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.status === 401) writeToken(null);
        else setError(cause instanceof Error ? cause.message : "دوباره تلاش کنید.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingEntries(false);
      });
    return () => controller.abort();
  }, [token]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) writeToken(null);
      setError(error instanceof Error ? error.message : "دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => Promise<void>,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(() => action(data));
  }

  async function load(session: string) {
    setEntries((await (await api("club-requests", undefined, session)).json()) as Entry[]);
  }

  const field = "block w-full rounded-lg border border-current/30 bg-transparent p-2";
  const button = "rounded-lg bg-white px-4 py-2 text-black disabled:opacity-50";
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          const form = event.currentTarget;
          void submit(event, async (data) => {
            const entry = (await (
              await api("club-requests", { ...Object.fromEntries(data), location }, token)
            ).json()) as Entry;
            setEntries((current) => [entry, ...current]);
            form.reset();
            setLocation(emptyClubLocation);
          });
        }}
      >
        <label>
          نام باشگاه
          <input className={field} name="title" maxLength={100} required />
        </label>
        <label>
          نوع باشگاه
          <select className={field} name="clubTypeId" required defaultValue="">
            <option value="">انتخاب کنید</option>
            {resources?.["types/club_types"].map(({ id, title }) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        {resourcesError && <p role="alert">بارگذاری گزینه‌های ثبت باشگاه ممکن نشد.</p>}
        {resources && (
          <ClubLocationFields
            mapTiles={process.env.NEXT_PUBLIC_CLUB_MAP_TILES}
            mapAttribution={process.env.NEXT_PUBLIC_CLUB_MAP_ATTRIBUTION}
            persian
            value={location}
            onChange={setLocation}
            resources={resources}
            fieldClassName={field}
          />
        )}
        <label>
          توضیحات اختیاری
          <textarea className={field} name="description" maxLength={1200} />
        </label>
        <button className={button} disabled={loadingEntries || busy || !resources}>
          ثبت درخواست
        </button>
      </form>
      <form className="flex gap-4" onSubmit={(event) => void submit(event, () => load(token))}>
        <button className="underline" disabled={loadingEntries || busy}>
          به‌روزرسانی وضعیت
        </button>
        <button
          className="underline"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api("auth/logout", {}, token);
              writeToken(null);
            })
          }
        >
          خروج
        </button>
      </form>
      <section aria-live="polite">
        <h2 className="text-lg font-bold">درخواست‌های من</h2>
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-current/30 p-3">
              <strong>{entry.profile.name}</strong>
              <p>{statuses[entry.status]}</p>
              {entry.rejectionReason && <p>{entry.rejectionReason}</p>}
              {entry.status === "approved" && (
                <a className="underline" href={new URL("/auth", business).href}>
                  ورود به پنل بیزینس
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

const ClubRegistration = () => {
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  return (
    <main dir="rtl" lang="fa" className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">درخواست ثبت باشگاه</h1>
      {token ?
        <ClubRequestForm key={token} token={token} />
      : <ApiProvider>
          <AuthForm locale="fa" />
        </ApiProvider>
      }
    </main>
  );
};

export default ClubRegistration;
