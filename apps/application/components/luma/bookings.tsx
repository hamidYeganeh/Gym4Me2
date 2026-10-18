"use client";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  useSportsBookings,
  type BookingTab,
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
  Segments,
  stamp,
  useLuma,
} from "./common";
import { LumaSheet } from "./sheet";
export function BookingsPage() {
  const t = useLuma();
  const locale = useLocale();
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const results = useRef<HTMLDivElement>(null);
  const nextFocus = useRef<number | null>(null);
  const query = useSportsBookings(tab);
  const data = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  useEffect(() => {
    if (query.isFetchingNextPage || nextFocus.current === null) return;
    if (data.length > nextFocus.current) {
      const target = results.current?.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/bookings/detail?"]',
      )[nextFocus.current];
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "instant" });
      nextFocus.current = null;
    } else if (query.error) nextFocus.current = null;
  }, [data.length, query.isFetchingNextPage, query.error]);
  return (
    <LumaPage title={t("yourBookings")} back="/">
      <Segments
        value={tab}
        onChange={(value) => {
          nextFocus.current = null;
          setTab(value === "past" ? "past" : "upcoming");
        }}
        options={(["upcoming", "past"] as const).map((v) => ({
          value: v,
          label: t(v),
        }))}
      />
      <QueryState
        query={{
          isPending: query.isPending,
          error: query.data ? null : query.error,
          refetch: query.refetch,
        }}
      >
        <p role="status" aria-atomic="true" className="sr-only">
          {query.data ? t("bookingListCount", { count: data.length }) : ""}
        </p>
        <div
          id="booking-results"
          ref={results}
          aria-busy={query.isFetchingNextPage}
        >
          {data.map((r) => (
            <Row
              key={r.id}
              title={r.title}
              meta={`${stamp(r.startAt, locale)} · ${r.branchName}`}
              state={r.status}
              href={`/bookings/detail?id=${r.id}`}
            />
          ))}
        </div>
        {!data.length && <Empty />}
        {query.data && query.error && <CommandError error={query.error} />}
        {query.hasNextPage && (
          <button
            className="luma-cta"
            disabled={query.isFetchingNextPage}
            aria-controls="booking-results"
            onClick={() => {
              nextFocus.current = data.length;
              void query.fetchNextPage();
            }}
          >
            {query.isFetchingNextPage ? t("loading") : t("loadMoreBookings")}
          </button>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function BookingDetail() {
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
  if (!id)
    return (
      <LumaPage title={t("yourBookings")} back="/bookings">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={query.data?.title ?? t("yourBookings")} back="/bookings">
      <QueryState query={query}>
        {query.data && (
          <>
            <Row
              title={stamp(query.data.startAt, locale)}
              meta={query.data.branchName}
              state={query.data.status}
            />
            <Section title={t("conditions")}>
              <p className="luma-meta">{query.data.snapshot.policy.terms}</p>
            </Section>
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
                          <button
                            className="luma-cta mb-4"
                            disabled={cancel.isPending}
                            onClick={() =>
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
                          >
                            {t("confirmCancel")}
                          </button>
                        </>
                      )}
                    </QueryState>
                    <CommandError error={cancel.error} />
                  </LumaSheet>
                )}
              </>
            )}
            {query.data.status === "confirmed" && (
              <>
                <button
                  className="luma-cta bg-muted text-foreground"
                  onClick={() => setRescheduleOpen((v) => !v)}
                >
                  {t("reschedule")}
                </button>
                {rescheduleOpen && (
                  <Field label={t("chooseSession")}>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">{t("chooseSession")}</option>
                      {service.data?.occurrences
                        .filter(
                          (o) =>
                            o.id !== query.data?.occurrenceId &&
                            o.remaining > 0 &&
                            o.resourceAvailable !== false,
                        )
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {stamp(o.startAt, locale)}
                          </option>
                        ))}
                    </select>
                    <button
                      className="luma-cta"
                      disabled={!target || change.isPending}
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
            title={m.title}
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
            <Link href="/services">{t("services")}</Link>
          </Empty>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function MembershipDetail() {
  const id = useSearchParams().get("id");
  const t = useLuma();
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
            <Row
              title={query.data.title}
              state={query.data.status}
              meta={`${t("remaining")}: ${query.data.granted === null ? "∞" : query.data.granted - query.data.consumed - query.data.held}`}
            />
            <Section title={t("conditions")}>
              <p className="luma-meta">{query.data.policy.terms}</p>
            </Section>
            {query.data.status === "active" && (
              <Link
                className="luma-cta"
                href={`/tickets/view?id=${id}&membership=true`}
              >
                {t("ticket")}
              </Link>
            )}
            <Link
              className="luma-cta bg-muted text-foreground"
              href={`/checkout?service=${query.data.serviceId}`}
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
                    onChange={(e) => setDays(Number(e.target.value))}
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
                <Row key={e.id} title={`${e.kind} · ${e.quantity}`} />
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
    <LumaPage title={t("orders")} back="/">
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
            {query.data.reservations.map((r) => (
              <Row
                key={r.id}
                title={r.title}
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
