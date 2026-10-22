"use client";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { useTrainingEvent } from "@repo/ui/training";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import { ReservationSummary } from "./reservation-design";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { checkoutIssue } from "../../lib/checkout-availability";
import {
  remainingMembershipSessions,
  usableCheckoutMemberships,
} from "../../lib/checkout-memberships";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
  type MembershipDto,
  type OrderDto,
  type QuoteDto,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  Price,
  QueryState,
  Row,
  useLuma,
} from "./common";
export function CheckoutPage() {
  const params = useSearchParams();
  const service = params.get("service");
  useTrainingEvent("checkout_opened", service);
  const occurrence = params.get("occurrence");
  return (
    <CheckoutForm
      key={`${service ?? ""}:${occurrence ?? ""}`}
      service={service}
      occurrence={occurrence}
    />
  );
}

function CheckoutForm({
  service,
  occurrence,
}: {
  service: string | null;
  occurrence: string | null;
}) {
  const t = useLuma();
  const copy = useTranslations("ReservationUI");
  const practiceCopy = useTranslations("Practice");
  const router = useRouter();
  const query = useSportsQuery<ServiceDto>(
    `sports/services/${service}`,
    undefined,
    Boolean(service),
  );
  const memberships = useSportsQuery<MembershipDto[]>(
    "sports/account/memberships",
  );
  const checkout = useSportsCommand<OrderDto>("sports/account/checkout");
  const quote = useSportsCommand<QuoteDto>("sports/account/quote");
  const [accepted, setAccepted] = useState(false);
  const [membership, setMembership] = useState("");
  const [coupon, setCoupon] = useState("");
  const key = useRef<string | null>(null);
  const membershipHintId = useId();
  const consent = useRef<HTMLLabelElement>(null);
  if (!service)
    return (
      <LumaPage title={t("checkout")} back="/services">
        <Empty />
      </LumaPage>
    );
  const selected = query.data?.occurrences.find((o) => o.id === occurrence);
  const unavailable = query.data ? checkoutIssue(query.data, occurrence) : null;
  const eligibleMemberships = query.data
    ? usableCheckoutMemberships(query.data, memberships.data ?? [])
    : [];
  const membershipUnavailable =
    Boolean(membership) &&
    !eligibleMemberships.some((item) => item.id === membership);
  const busy = quote.isPending || checkout.isPending;
  return (
    <LumaPage
      title={copy("reviewCheckout")}
      back={`/services/detail?id=${service}`}
      className="checkout-page"
    >
      <QueryState query={query}>
        {query.data && (
          <>
            <p className="checkout-review-label">{copy("reviewHint")}</p>
            <ReservationSummary
              title={query.data.title}
              venue={`${query.data.clubName} · ${query.data.branchName}`}
              startAt={selected?.startAt}
              endAt={selected?.endAt}
              amountMinor={quote.data?.amountMinor ?? query.data.amountMinor}
              cover={quote.data ? quote.data.cover : query.data.cover}
            />
            {unavailable && (
              <p role="alert" className="luma-meta">
                {t(unavailable)}{" "}
                <Link
                  className="underline"
                  href={`/services/detail?id=${service}`}
                >
                  {t("chooseSession")}
                </Link>
              </p>
            )}
            <details className="reservation-policy">
              <summary>{t("conditions")}</summary>
              <p className="luma-meta whitespace-pre-wrap">
                {quote.data?.policy.terms ?? query.data.policy.terms}
              </p>
            </details>
            <ServiceEligibilitySummary
              value={quote.data?.eligibility ?? query.data.eligibility}
            />
            {quote.data?.coaching && (
              <div className="luma-group">
                <Row title={practiceCopy("entryIncluded")}>
                  <Price value={quote.data.coaching.entryAmountMinor} />
                </Row>
                <Row title={practiceCopy("coachFee")}>
                  <Price value={quote.data.coaching.coachingAmountMinor} />
                </Row>
              </div>
            )}
            {query.data.kind === "course" && (
              <p className="luma-meta my-4">{t("courseRegistrationHint")}</p>
            )}
            {memberships.error?.status === 401 && (
              <p className="luma-meta mt-6">{t("checkoutSignInHint")}</p>
            )}
            <QueryState query={memberships}>
              <details className="reservation-policy">
                <summary>{copy("membershipOrCoupon")}</summary>
                {query.data.kind !== "membership" && (
                  <Field label={t("useMembership")}>
                    <NativeSelect
                      value={membership}
                      disabled={busy}
                      aria-describedby={membershipHintId}
                      aria-errormessage={
                        membershipUnavailable
                          ? `${membershipHintId}-error`
                          : undefined
                      }
                      aria-invalid={membershipUnavailable}
                      onChange={(e) => {
                        setMembership(e.target.value);
                        key.current = null;
                        quote.reset();
                        setAccepted(false);
                      }}
                    >
                      <option value="">{t("noMembership")}</option>
                      {membershipUnavailable && (
                        <option value={membership} disabled>
                          {t("checkoutMembershipUnavailable")}
                        </option>
                      )}
                      {eligibleMemberships.map((m) => (
                        <NativeSelectOption
                          value={m.id}
                          key={m.id}
                          subtitle={
                            m.granted === null
                              ? t("checkoutMembershipUnlimited")
                              : t("checkoutMembershipRemaining", {
                                  count: remainingMembershipSessions(m)!,
                                })
                          }
                        >
                          {m.title}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                {query.data.kind !== "membership" && (
                  <p id={membershipHintId} className="luma-meta">
                    {t("checkoutMembershipHint")}{" "}
                    <Link className="underline" href="/memberships">
                      {t("memberships")}
                    </Link>
                  </p>
                )}
                {membershipUnavailable && (
                  <p
                    id={`${membershipHintId}-error`}
                    role="alert"
                    className="luma-error"
                  >
                    {t("checkoutMembershipUnavailable")}
                  </p>
                )}
                <Field label={t("coupon")}>
                  <input
                    value={coupon}
                    disabled={busy}
                    onChange={(e) => {
                      setCoupon(e.target.value);
                      key.current = null;
                      quote.reset();
                      setAccepted(false);
                    }}
                    maxLength={60}
                    autoCapitalize="characters"
                  />
                </Field>
              </details>
              {quote.data && quote.data.balanceDueMinor !== "0" && (
                <>
                  <Row title={t("payNow")}>
                    <Price value={quote.data.payNowMinor} />
                  </Row>
                  {quote.data.balanceDueMinor !== "0" && (
                    <Row title={t("balance")}>
                      <Price value={quote.data.balanceDueMinor} />
                    </Row>
                  )}
                </>
              )}
              <label
                ref={consent}
                tabIndex={-1}
                className="luma-consent flex gap-3 items-start mt-6 leading-7"
              >
                <input
                  type="checkbox"
                  className="mt-2 size-5"
                  disabled={!quote.data || busy}
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>{t("termsAccept")}</span>
              </label>
              <CommandError error={checkout.error ?? quote.error} />
              <div className="checkout-footer">
                <div>
                  <p>{quote.data ? t("payNow") : copy("estimatedTotal")}</p>
                  <strong>
                    {quote.data ? (
                      <Price value={quote.data.payNowMinor} />
                    ) : (
                      <Price value={query.data.amountMinor} />
                    )}
                  </strong>
                </div>
                <button
                  className="luma-cta"
                  disabled={
                    (Boolean(quote.data) && !accepted) ||
                    busy ||
                    membershipUnavailable ||
                    Boolean(unavailable) ||
                    (!occurrence && query.data.kind !== "membership")
                  }
                  onClick={() => {
                    if (!quote.data) {
                      setAccepted(false);
                      key.current = null;
                      checkout.reset();
                      quote.mutate(
                        {
                          serviceId: service,
                          occurrenceId:
                            query.data?.kind === "membership"
                              ? undefined
                              : (occurrence ?? undefined),
                          membershipId: membership || undefined,
                          coupon: coupon || undefined,
                        },
                        {
                          onSuccess: () =>
                            requestAnimationFrame(() => {
                              consent.current?.focus({ preventScroll: true });
                              consent.current?.scrollIntoView({
                                block: "center",
                                behavior: "instant",
                              });
                            }),
                        },
                      );
                      return;
                    }
                    key.current ??= crypto.randomUUID();
                    checkout.mutate(
                      {
                        serviceId: service,
                        occurrenceId:
                          query.data?.kind === "membership"
                            ? undefined
                            : (occurrence ?? undefined),
                        membershipId: membership || undefined,
                        coupon: coupon || undefined,
                        quoteId: quote.data!.id,
                        idempotencyKey: key.current,
                      },
                      {
                        onSuccess: (order) =>
                          router.push(`/checkout/status?order=${order.id}`),
                        onError: (error) => {
                          if (error.status === 409) {
                            quote.reset();
                            key.current = null;
                            setAccepted(false);
                          }
                        },
                      },
                    );
                  }}
                >
                  {t(quote.data ? "continue" : "reviewPrice")}
                </button>
              </div>
            </QueryState>
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
export function PaymentStatus() {
  const t = useLuma();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("order");
  const query = useSportsQuery<OrderDto>(
    `sports/account/orders/${id}`,
    undefined,
    Boolean(id),
    true,
  );
  const payment = useSportsCommand(`sports/account/orders/${id}/payment`);
  const verify = useSportsCommand(`sports/account/orders/${id}/verify`);
  const reconcile = useSportsCommand(`sports/account/orders/${id}/query`);
  const [scenario, setScenario] = useState("success");
  const paymentKey = useRef<string | null>(null);
  if (!id)
    return (
      <LumaPage
        title={t("paymentStatus")}
        back="/orders"
        className="payment-page"
      >
        <Empty />
      </LumaPage>
    );
  const order = query.data;
  return (
    <LumaPage
      title={t("paymentStatus")}
      back="/orders"
      className="payment-page"
    >
      <QueryState query={query}>
        {order && (
          <>
            <ReservationSummary
              title={order.snapshot.title}
              amountMinor={order.amountMinor}
              state={order.status}
            />
            {["awaiting_payment", "partially_paid"].includes(order.status) && (
              <>
                <p className="luma-meta mt-6">{t("sandbox")}</p>
                <Row title={t("balance")}>
                  <Price value={order.balanceDueMinor} />
                </Row>
                {!order.payments.some((p) =>
                  ["pending", "unknown"].includes(p.state),
                ) ? (
                  <>
                    <Field label={t("pay")}>
                      <NativeSelect
                        value={scenario}
                        onChange={(e) => {
                          setScenario(e.target.value);
                          paymentKey.current = null;
                        }}
                      >
                        {(
                          ["success", "failure", "timeout", "late"] as const
                        ).map((v) => (
                          <option value={v} key={v}>
                            {t(v)}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <button
                      className="luma-cta"
                      disabled={payment.isPending}
                      onClick={() => {
                        paymentKey.current ??= crypto.randomUUID();
                        payment.mutate(
                          { scenario, idempotencyKey: paymentKey.current },
                          {
                            onSuccess: () => {
                              paymentKey.current = null;
                              router.push(`/checkout/mock-gateway?order=${id}`);
                            },
                          },
                        );
                      }}
                    >
                      {t("pay")}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="luma-meta mt-6">{t("paymentPending")}</p>
                    {order.payments.some((p) => p.state === "pending") && (
                      <Link
                        className="luma-cta"
                        href={`/checkout/mock-gateway?order=${id}`}
                      >
                        {t("openMockGateway")}
                      </Link>
                    )}
                    <button
                      className="luma-cta"
                      disabled={verify.isPending}
                      onClick={() => verify.mutate({})}
                    >
                      {t("verify")}
                    </button>
                    {order.payments.some((p) => p.state === "unknown") && (
                      <button
                        className="luma-cta"
                        disabled={reconcile.isPending}
                        onClick={() => reconcile.mutate({})}
                      >
                        {t("retry")}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            {order.reservations
              .filter(
                (r) =>
                  r.status === "confirmed" || r.status === "pending_approval",
              )
              .map((r) => (
                <Link
                  key={r.id}
                  className="luma-cta"
                  href={`/bookings/detail?id=${r.id}`}
                >
                  {t("yourBookings")}
                </Link>
              ))}
            {order.status === "paid" && !order.reservations.length && (
              <Link className="luma-cta" href="/memberships">
                {t("memberships")}
              </Link>
            )}
            {order.status === "review" && (
              <Link className="luma-cta" href={`/support?order=${id}`}>
                {t("support")}
              </Link>
            )}
            <Link
              className="luma-cta bg-muted text-foreground"
              href={`/orders/detail?id=${id}`}
            >
              {t("details")}
            </Link>
            <CommandError
              error={payment.error ?? verify.error ?? reconcile.error}
            />
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
