"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "@repo/i18n";
import {
  useSportsCommand,
  useSportsQuery,
  type BookingDto,
  type MembershipDto,
} from "@repo/api/sports";
import { ticketWindow } from "../../lib/ticket-window";
import {
  CommandError,
  Empty,
  LumaPage,
  QueryState,
  Row,
  stamp,
  useLuma,
} from "./common";
export function TicketPage() {
  const t = useLuma();
  const w = useTranslations("Workflow");
  const locale = useLocale();
  const params = useSearchParams();
  const id = params.get("id");
  const membership = params.get("membership") === "true";
  const [pass, setPass] = useState("");
  const booking = useSportsQuery<BookingDto>(
    `sports/account/bookings/${id}`,
    undefined,
    Boolean(id) && !membership,
  );
  const passes = useSportsQuery<
    { id: string; ordinal: number; name: string; admittedAt: string | null }[]
  >(
    `sports/account/bookings/${id}/passes`,
    undefined,
    Boolean(id) && !membership,
  );
  const token = useSportsCommand<{ token: string; expiresAt: string }>(
    `sports/account/${membership ? "memberships" : "bookings"}/${id}/ticket`,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [qrError, setQrError] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    let disposed = false;
    if (token.data && canvas.current) {
      void import("qrcode")
        .then((module) => {
          if (!disposed && canvas.current)
            return module.toCanvas(canvas.current, token.data!.token, {
              width: 280,
              margin: 2,
              errorCorrectionLevel: "M",
            });
        })
        .catch(() => {
          if (!disposed) setQrError(true);
        });
    }
    return () => {
      disposed = true;
    };
  }, [token.data]);
  if (!id)
    return (
      <LumaPage title={t("ticket")} back="/">
        <Empty />
      </LumaPage>
    );
  const expired =
    Boolean(token.data) && new Date(token.data!.expiresAt).getTime() <= clock;
  const entryWindow = booking.data
    ? ticketWindow(booking.data.startAt, booking.data.endAt, clock)
    : undefined;
  return (
    <LumaPage
      title={t("ticket")}
      back={
        membership
          ? `/memberships/detail?id=${id}`
          : `/bookings/detail?id=${id}`
      }
    >
      {!membership && (
        <QueryState query={booking}>
          {entryWindow && !entryWindow.available && (
            <p className="luma-meta" role="status">
              {entryWindow.upcoming
                ? t("ticketOpensAt", {
                    time: stamp(
                      new Date(entryWindow.opensAt).toISOString(),
                      locale,
                    ),
                  })
                : t("ticketSessionEnded")}
            </p>
          )}
        </QueryState>
      )}
      {!!passes.data?.length && (
        <fieldset className="grid gap-3 my-4">
          <legend>{w("passes")}</legend>
          {passes.data.map((p) => (
            <label key={p.id} className="flex gap-3 items-center">
              <input
                type="radio"
                name="pass"
                value={p.id}
                disabled={Boolean(p.admittedAt)}
                checked={pass === p.id}
                onChange={() => {
                  setPass(p.id);
                  token.reset();
                }}
              />
              {p.name || String(p.ordinal)} {p.admittedAt && w("used")}
            </label>
          ))}
        </fieldset>
      )}
      <div className="luma-ticket">
        {token.data && !expired ? (
          <>
            <canvas ref={canvas} role="img" aria-label={t("ticket")} />
            <p className="luma-meta">
              {t("expires")}: {stamp(token.data.expiresAt, locale)}
            </p>
            <details className="w-full">
              <summary>{t("manualCode")}</summary>
              <p className="break-all text-sm select-text mt-3" dir="ltr">
                {token.data.token}
              </p>
            </details>
            {qrError && (
              <p role="alert" className="luma-error">
                {t("actionError")}
              </p>
            )}
          </>
        ) : (
          <Empty>{expired ? t("status.expired") : t("ticket")}</Empty>
        )}
      </div>
      <button
        className="luma-cta"
        disabled={token.isPending || (!membership && !entryWindow?.available)}
        onClick={() => {
          setQrError(false);
          token.mutate({ entryPassId: pass || undefined });
        }}
      >
        {t("refreshTicket")}
      </button>
      <CommandError error={token.error} />
    </LumaPage>
  );
}
export function MembershipCardPage() {
  const t = useLuma();
  const query = useSportsQuery<MembershipDto[]>("sports/account/memberships");
  return (
    <LumaPage title={t("ticket")} back="/">
      <QueryState query={query}>
        {query.data
          ?.filter((m) => m.status === "active")
          .map((m) => (
            <Row
              key={m.id}
              title={m.title}
              href={`/tickets/view?id=${m.id}&membership=true`}
            />
          ))}
        {!query.data?.some((m) => m.status === "active") && (
          <Empty>
            <Link href="/memberships">{t("memberships")}</Link>
          </Empty>
        )}
      </QueryState>
    </LumaPage>
  );
}
