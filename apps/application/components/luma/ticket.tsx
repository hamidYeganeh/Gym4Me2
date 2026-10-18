"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import {
  useSportsCommand,
  useSportsQuery,
  type MembershipDto,
} from "@repo/api/sports";
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
  const locale = useLocale();
  const params = useSearchParams();
  const id = params.get("id");
  const membership = params.get("membership") === "true";
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
  return (
    <LumaPage
      title={t("ticket")}
      back={
        membership
          ? `/memberships/detail?id=${id}`
          : `/bookings/detail?id=${id}`
      }
    >
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
        disabled={token.isPending}
        onClick={() => {
          setQrError(false);
          token.mutate({});
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
