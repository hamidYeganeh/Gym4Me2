"use client";
import { TuitionPlan } from "@repo/ui/sports-tuition";
import { ReceiptForm } from "@repo/ui/sports-receipts";
import { ConfirmAction } from "@repo/ui/confirm-action";
import { BookingCalendar } from "./booking-calendar";
import { NativeSelect } from "@repo/ui/kit/NativeSelect";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type BookingDto,
  type MembershipDto,
  type OrderDto,
  type ServiceDto,
  type WaitlistDto,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  Price,
  QueryState,
  Row,
  Section,
  stamp,
  useLuma,
} from "./common";
import { ReservationSummary } from "./reservation-design";
import { useTranslations } from "@repo/i18n";
import { LumaSheet } from "./sheet";
import { rescheduleOptions } from "../../lib/reschedule-options";
import { useAppClock } from "./use-app-clock";
import { membershipAccess } from "../../lib/membership-access";
import { boundedCount } from "@repo/ui/lib/integer-input";
export function BookingsPage() {
  const t = useLuma();
  return (
    <LumaPage title={t("yourBookings")} back="/" className="reservation-list">
      <BookingCalendar />
    </LumaPage>
  );
}
export function BookingDetail() {
  const copy = useTranslations("ReservationUI");
  const id = useSearchParams().get("id");
  const t = useLuma();
  const locale = useLocale();
  const [showCancel, setShowCancel] = useState(false);
  const [target, setTarget] = useState("");
  const query = useSportsQuery<BookingDto>(
    `sports/account/bookings/${id}`,
    undefined,
    Boolean(id),
  );
  const preview = useSportsQuery<{
    revision: number;
    refundMinor: string;
    restoreSession: boolean;
    terms: string;
  }>(
    `sports/account/bookings/${id}/cancellation`,
    undefined,
    Boolean(id) && showCancel,
  );
  const serviceId = query.data?.serviceId;
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const service = useSportsQuery<ServiceDto>(
    `sports/services/${serviceId}`,
    undefined,
    Boolean(serviceId) && rescheduleOpen,
  );
  const cancel = useSportsCommand(`sports/account/bookings/${id}/cancel`);
  const change = useSportsCommand(`sports/account/bookings/${id}/reschedule`);
  const now = useAppClock();
  const alternatives = rescheduleOptions(
    service.data?.occurrences ?? [],
    query.data?.occurrenceId ?? "",
    query.data?.quantity ?? 1,
    now,
  );
  if (!id)
    return (
      <LumaPage title={t("yourBookings")} back="/bookings">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage
      title={copy("bookingDetails")}
      back="/bookings"
      className="reservation-detail"
    >
      <QueryState query={query}>
        {query.data && (
          <>
            <ReservationSummary
              title={query.data.title}
              venue={query.data.branchName}
              startAt={query.data.startAt}
              endAt={query.data.endAt}
              amountMinor={query.data.amountMinor}
              state={query.data.status}
              orderTotal
            />
            <details className="reservation-policy">
              <summary>{copy("cancellationPolicy")}</summary>
              <p className="luma-meta whitespace-pre-wrap">
                {query.data.snapshot.policy.terms}
              </p>
            </details>
            <ServiceEligibilitySummary
              value={query.data.snapshot.eligibility}
            />
            {query.data.status === "confirmed" && (
              <Link className="luma-cta" href={`/tickets/view?id=${id}`}>
                {t("ticket")}
              </Link>
            )}
            {["held", "pending_approval", "confirmed"].includes(
              query.data.status,
            ) && (
              <>
                <button
                  className="luma-cta bg-muted text-foreground"
                  onClick={() => setShowCancel((v) => !v)}
                >
                  {t("cancel")}
                </button>
                {showCancel && (
                  <LumaSheet
                    open={showCancel}
                    onOpenChange={setShowCancel}
                    title={t("cancel")}
                  >
                    <QueryState query={preview}>
                      {preview.data && (
                        <>
                          <Row title={t("refund")}>
                            <Price value={preview.data.refundMinor} />
                          </Row>
                          <p className="luma-meta">{preview.data.terms}</p>
                          <ConfirmAction
                            label={t("confirmCancel")}
                            disabled={cancel.isPending}
                            onConfirm={() =>
                              cancel.mutate(
                                {
                                  revision: preview.data!.revision,
                                  expectedRefundMinor:
                                    preview.data!.refundMinor,
                                  idempotencyKey: crypto.randomUUID(),
                                },
                                { onSuccess: () => setShowCancel(false) },
                              )
                            }
                          />
                        </>
                      )}
                    </QueryState>
                    <CommandError error={cancel.error} />
                  </LumaSheet>
                )}
              </>
            )}
            {query.data.status === "confirmed" &&
              query.data.snapshot.kind === "course" && (
                <p className="luma-meta">{t("courseRescheduleSupport")}</p>
              )}
            {query.data.status === "confirmed" &&
              !query.data.checkedInAt &&
              query.data.snapshot.kind !== "course" && (
                <>
                  <button
                    className="luma-cta bg-muted text-foreground"
                    onClick={() => setRescheduleOpen((v) => !v)}
                  >
                    {t("reschedule")}
                  </button>
                  {rescheduleOpen && (
                    <QueryState query={service}>
                      {alternatives.length === 0 ? (
                        <Empty compact>{t("noRescheduleSessions")}</Empty>
                      ) : (
                        <Field label={t("chooseSession")}>
                          <NativeSelect
                            value={target}
                            disabled={change.isPending}
                            onChange={(e) => setTarget(e.target.value)}
                          >
                            <option value="">{t("chooseSession")}</option>
                            {alternatives.map((o) => (
                              <option key={o.id} value={o.id}>
                                {stamp(o.startAt, locale)}
                              </option>
                            ))}
                          </NativeSelect>
                          <button
                            className="luma-cta"
                            disabled={
                              !alternatives.some(
                                (item) => item.id === target,
                              ) || change.isPending
                            }
                            onClick={() =>
                              change.mutate(
                                {
                                  occurrenceId: target,
                                  revision: query.data!.revision,
                                  idempotencyKey: crypto.randomUUID(),
                                },
                                { onSuccess: () => setRescheduleOpen(false) },
                              )
                            }
                          >
                            {t("continue")}
                          </button>
                        </Field>
                      )}
                    </QueryState>
                  )}
                </>
              )}
            <CommandError error={cancel.error ?? change.error} />
            <Link
              className="luma-cta bg-muted text-foreground"
              href={`/support?order=${query.data.orderId}`}
            >
              {t("support")}
            </Link>
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function MembershipsPage() {
  const t = useLuma();
  const locale = useLocale();
  const query = useSportsQuery<MembershipDto[]>("sports/account/memberships");
  return (
    <LumaPage title={t("memberships")} back="/">
      <QueryState query={query}>
        {query.data?.map((m) => (
          <Row
            key={m.id}
            title={
              m.dependentName ? `${m.dependentName} · ${m.title}` : m.title
            }
            meta={m.endsAt ? stamp(m.endsAt, locale) : ""}
            state={m.status}
            href={`/memberships/detail?id=${m.id}`}
          >
            <span className="luma-meta">
              {t("remaining")}:{" "}
              {m.granted === null ? "∞" : m.granted - m.consumed - m.held}
            </span>
          </Row>
        ))}
        {!query.data?.length && (
          <Empty>
            <p>{t("noMembershipsYet")}</p>
            <Link href="/services">{t("services")}</Link>
          </Empty>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function MembershipDetail() {
  const clock = useAppClock();
  const id = useSearchParams().get("id");
  const t = useLuma();
  const locale = useLocale();
  const eventLabels: Record<string, string> = {
    grant: t("entitlement.grant"),
    hold: t("entitlement.hold"),
    consume: t("entitlement.consume"),
    release: t("entitlement.release"),
    restore: t("entitlement.restore"),
  };
  const query = useSportsQuery<MembershipDto>(
    `sports/account/memberships/${id}`,
    undefined,
    Boolean(id),
  );
  const freeze = useSportsCommand(`sports/account/memberships/${id}/freeze`);
  const [days, setDays] = useState(1);
  if (!id)
    return (
      <LumaPage title={t("memberships")} back="/memberships">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={query.data?.title ?? t("memberships")} back="/memberships">
      <QueryState query={query}>
        {query.data && (
          <>
            <p className="luma-meta">{query.data.dependentName}</p>
            <Row
              title={query.data.title}
              state={query.data.status}
              meta={`${t("remaining")}: ${query.data.granted === null ? "∞" : query.data.granted - query.data.consumed - query.data.held}`}
            />
            <Section title={t("conditions")}>
              <p className="luma-meta">{query.data.policy.terms}</p>
            </Section>
            {membershipAccess(query.data, clock) === "active" && (
              <Link
                className="luma-cta"
                href={`/tickets/view?id=${id}&membership=true`}
              >
                {t("ticket")}
              </Link>
            )}
            <Link
              className="luma-cta bg-muted text-foreground"
              href={`/checkout?service=${query.data.serviceId}&renew=${id}${query.data.dependentId ? `&dependent=${query.data.dependentId}` : ""}`}
            >
              {t("renew")}
            </Link>
            {query.data.status === "active" &&
              query.data.policy.freezeDays > 0 && (
                <Field label={t("days")}>
                  <input
                    type="number"
                    min={1}
                    max={query.data.policy.freezeDays}
                    value={days}
                    onChange={(e) =>
                      setDays(
                        boundedCount(
                          e.target.value,
                          query.data!.policy.freezeDays,
                        ),
                      )
                    }
                  />
                  <button
                    className="luma-cta"
                    disabled={freeze.isPending}
                    onClick={() =>
                      freeze.mutate({ revision: query.data!.revision, days })
                    }
                  >
                    {t("freeze")}
                  </button>
                </Field>
              )}
            <CommandError error={freeze.error} />
            <Section title={t("history")}>
              {query.data.events.map((e) => (
                <Row
                  key={e.id}
                  title={`${eventLabels[e.kind] ?? t("history")} · ${new Intl.NumberFormat(locale).format(e.quantity)}`}
                  meta={stamp(e.createdAt, locale)}
                />
              ))}
            </Section>
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function OrdersPage() {
  const t = useLuma();
  const locale = useLocale();
  const query = useSportsQuery<OrderDto[]>("sports/account/orders");
  return (
    <LumaPage title={t("orders")} back="/" className="reservation-list">
      <QueryState query={query}>
        {query.data?.map((o) => (
          <Row
            key={o.id}
            title={o.snapshot.title}
            state={o.status}
            meta={stamp(o.createdAt, locale)}
            href={`/orders/detail?id=${o.id}`}
          >
            <Price value={o.amountMinor} />
          </Row>
        ))}
        {!query.data?.length && <Empty />}
      </QueryState>
    </LumaPage>
  );
}
export function OrderDetail() {
  const id = useSearchParams().get("id");
  const t = useLuma();
  const query = useSportsQuery<OrderDto>(
    `sports/account/orders/${id}`,
    undefined,
    Boolean(id),
  );
  if (!id)
    return (
      <LumaPage title={t("orders")} back="/orders">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={t("orders")} back="/orders">
      <QueryState query={query}>
        {query.data && (
          <>
            <Row title={query.data.snapshot.title} state={query.data.status} />
            <Section title={t("price")}>
              <Price value={query.data.amountMinor} />
            </Section>
            <Section title={t("conditions")}>
              <p className="luma-meta">{query.data.snapshot.policy.terms}</p>
            </Section>
            <ServiceEligibilitySummary
              value={query.data.snapshot.eligibility}
            />
            {["awaiting_payment", "partially_paid"].includes(
              query.data.status,
            ) && (
              <Link className="luma-cta" href={`/checkout/status?order=${id}`}>
                {t("continue")}
              </Link>
            )}
            {["awaiting_payment", "partially_paid"].includes(
              query.data.status,
            ) && <ReceiptForm orderId={id} />}
            {query.data.snapshot.kind === "membership" && (
              <TuitionPlan orderId={id} />
            )}
            {query.data.reservations.map((r) => (
              <Row
                key={r.id}
                title={r.title}
                date={r.startAt}
                state={r.status}
                href={`/bookings/detail?id=${r.id}`}
              />
            ))}
            {query.data.refunds.map((r) => (
              <Row
                key={r.id}
                title={t("refund")}
                meta={r.reason}
                state={r.state}
              >
                <Price value={r.amountMinor} />
              </Row>
            ))}
            <Link
              className="luma-cta bg-muted text-foreground"
              href={`/support?order=${id}`}
            >
              {t("support")}
            </Link>
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function WaitlistPage() {
  const t = useLuma();
  const query = useSportsQuery<WaitlistDto[]>(
    "sports/account/waitlist",
    undefined,
    true,
    true,
  );
  return (
    <LumaPage title={t("waitlist")} back="/">
      <QueryState query={query}>
        {query.data?.map((w) => (
          <WaitlistRow key={w.id} item={w} />
        ))}
        {!query.data?.length && <Empty />}
      </QueryState>
    </LumaPage>
  );
}
function WaitlistRow({ item }: { item: WaitlistDto }) {
  const t = useLuma();
  const router = useRouter();
  const accept = useSportsCommand<OrderDto>(
    `sports/account/waitlist/${item.id}/accept`,
  );
  const withdraw = useSportsCommand(
    `sports/account/waitlist/${item.id}/withdraw`,
  );
  return (
    <div className="luma-group mb-3">
      <Row
        title={item.title}
        state={item.status}
        href={`/services/detail?id=${item.serviceId}`}
      />
      {item.status === "offered" && (
        <>
          <p className="luma-meta">
            {item.offerExpiresAt ? stamp(item.offerExpiresAt, "fa") : ""}
          </p>
          <button
            className="luma-cta"
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(
                {},
                {
                  onSuccess: (order) =>
                    router.push(`/checkout/status?order=${order.id}`),
                },
              )
            }
          >
            {t("accept")}
          </button>
        </>
      )}
      <CommandError error={accept.error} />
      <button
        className="luma-cta bg-background text-foreground mb-3"
        disabled={withdraw.isPending}
        onClick={() => withdraw.mutate({})}
      >
        {t("cancel")}
      </button>
      <CommandError error={withdraw.error} />
    </div>
  );
}
