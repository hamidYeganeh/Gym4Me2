"use client";
import { TuitionPlan } from "@repo/ui/sports-tuition";
import { IranianDateInput } from "@repo/ui/kit/IranianDateInput";
import { ReceiptForm } from "@repo/ui/sports-receipts";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { useTrainingEvent } from "@repo/ui/training";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import { ReservationSummary } from "./reservation-design";
import { Check } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { checkoutIssue } from "../../lib/checkout-availability";
import { paymentGatewayDestination } from "../../lib/payment-gateway";
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
  type PaymentAttemptDto,
  type ParticipantDto,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  Price,
  QueryState,
  Row,
  stamp,
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
  const w = useTranslations("Workflow");
  const locale = useLocale();
  const params = useSearchParams();
  const [renewMembershipId, setRenewMembershipId] = useState(
    params.get("renew") ?? "",
  );
  const [startsOn, setStartsOn] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [dependentId, setDependentId] = useState(params.get("dependent") ?? "");
  const dependents =
    useSportsQuery<{ id: string; name: string; status: string }[]>(
      "profile/household",
    );
  const [participants, setParticipants] = useState<ParticipantDto[]>([
    { name: "", birthDate: null, gender: "unspecified" },
  ]);
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
  const enrollSeries = useSportsCommand(
    "profile/sports-workflows/series-enrollment",
  );
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
  const eligibleMemberships =
    query.data && quantity === 1
      ? usableCheckoutMemberships(query.data, memberships.data ?? []).filter(
          (m) => (m.dependentId ?? "") === dependentId && !m.paymentOverdue,
        )
      : [];
  const membershipUnavailable =
    Boolean(membership) &&
    !eligibleMemberships.some((item) => item.id === membership);
  const busy = quote.isPending || checkout.isPending;
  const identityRequired =
    quantity > 1 ||
    (query.data?.offering?.audience &&
      query.data.offering.audience !== "all") ||
    query.data?.eligibility.minimumAge != null ||
    query.data?.eligibility.maximumAge != null;
  const purchaseDetails = {
    dependentId: dependentId || undefined,
    quantity,
    participants:
      !dependentId && (identityRequired || participants[0]?.name)
        ? participants
        : [],
    renewMembershipId: renewMembershipId || undefined,
    startsOn: startsOn || undefined,
  };
  const changeDetails = () => {
    quote.reset();
    checkout.reset();
    key.current = null;
    setAccepted(false);
  };
  const incomplete =
    !dependentId &&
    Boolean(identityRequired) &&
    participants.some(
      (p) =>
        p.name.trim().length < 2 ||
        ((query.data?.eligibility.minimumAge != null ||
          query.data?.eligibility.maximumAge != null) &&
          !p.birthDate) ||
        (["men", "women"].includes(query.data?.offering?.audience ?? "") &&
          p.gender === "unspecified"),
    );
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
              amountMinor={
                quote.data?.amountMinor ??
                (BigInt(query.data.amountMinor) * BigInt(quantity)).toString()
              }
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
            {query.data.kind === "access" && (
              <Field label={w("quantity")}>
                <input
                  type="number"
                  min={1}
                  max={query.data.offering?.maxTickets ?? 20}
                  value={quantity}
                  onChange={(e) => {
                    const n = Math.min(
                      query.data?.offering?.maxTickets ?? 20,
                      Math.max(1, Number(e.target.value) || 1),
                    );
                    setQuantity(n);
                    if (n > 1) setDependentId("");
                    if (n > 1) setMembership("");
                    setParticipants(
                      Array.from(
                        { length: n },
                        (_, i) =>
                          participants[i] ?? {
                            name: "",
                            birthDate: null,
                            gender: "unspecified",
                          },
                      ),
                    );
                    changeDetails();
                  }}
                />
              </Field>
            )}
            {quantity === 1 && (
              <Field label={w("beneficiary")}>
                <select
                  value={dependentId}
                  onChange={(e) => {
                    setDependentId(e.target.value);
                    setMembership("");
                    setRenewMembershipId("");
                    changeDetails();
                  }}
                >
                  <option value="">{w("myself")}</option>
                  {dependents.data
                    ?.filter((d) => d.status === "active")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
                <Link className="underline" href="/household">
                  {w("household")}
                </Link>
              </Field>
            )}
            {!dependentId &&
              (identityRequired ||
                (query.data.kind !== "membership" &&
                  query.data.kind !== "program")) &&
              participants.map((person, i) => (
                <fieldset className="luma-group my-3 p-4 grid gap-3" key={i}>
                  <legend>{w("participant", { number: i + 1 })}</legend>
                  <Field label={w("name")}>
                    <input
                      value={person.name}
                      maxLength={120}
                      onChange={(e) => {
                        setParticipants(
                          participants.map((p, j) =>
                            j === i ? { ...p, name: e.target.value } : p,
                          ),
                        );
                        changeDetails();
                      }}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={w("birthDate")}>
                      <IranianDateInput
                        value={person.birthDate ?? ""}
                        onValueChange={(iso) => {
                          setParticipants(
                            participants.map((p, j) =>
                              j === i ? { ...p, birthDate: iso || null } : p,
                            ),
                          );
                          changeDetails();
                        }}
                      />
                    </Field>
                    <Field label={w("gender")}>
                      <select
                        value={person.gender}
                        onChange={(e) => {
                          setParticipants(
                            participants.map((p, j) =>
                              j === i
                                ? {
                                    ...p,
                                    gender: e.target
                                      .value as ParticipantDto["gender"],
                                  }
                                : p,
                            ),
                          );
                          changeDetails();
                        }}
                      >
                        {(["unspecified", "male", "female"] as const).map(
                          (g) => (
                            <option key={g} value={g}>
                              {w(g)}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>
                </fieldset>
              ))}
            {query.data.kind === "membership" && (
              <>
                <Field label={w("renew")}>
                  <select
                    value={renewMembershipId}
                    onChange={(e) => {
                      setRenewMembershipId(e.target.value);
                      changeDetails();
                    }}
                  >
                    <option value="">{w("newMembership")}</option>
                    {memberships.data
                      ?.filter(
                        (m) =>
                          m.serviceId === service &&
                          (m.dependentId ?? "") === dependentId &&
                          ["active", "expired", "frozen"].includes(m.status),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                          {m.endsAt ? ` · ${stamp(m.endsAt, locale)}` : ""}
                        </option>
                      ))}
                  </select>
                </Field>
                {renewMembershipId && (
                  <p className="luma-meta">{w("renewHint")}</p>
                )}
                <Field label={w("startsOn")}>
                  <IranianDateInput
                    value={startsOn}
                    onValueChange={(iso) => {
                      setStartsOn(iso);
                      changeDetails();
                    }}
                  />
                </Field>
              </>
            )}
            {query.data.offering?.confirmation === "before_payment" && (
              <p className="luma-meta">{w("coordinationHint")}</p>
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
                {!["membership", "program"].includes(query.data.kind) && (
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
                {!["membership", "program"].includes(query.data.kind) && (
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
              <CommandError
                error={checkout.error ?? quote.error ?? enrollSeries.error}
              />
              {selected?.seriesId && membership && (
                <button
                  className="luma-cta my-3"
                  disabled={!accepted || !quote.data || enrollSeries.isPending}
                  onClick={() => {
                    key.current ??= crypto.randomUUID();
                    enrollSeries.mutate(
                      {
                        serviceId: service,
                        seriesId: selected.seriesId,
                        membershipId: membership,
                        dependentId: dependentId || undefined,
                        participants: purchaseDetails.participants,
                        idempotencyKey: key.current,
                      },
                      { onSuccess: () => router.push("/bookings") },
                    );
                  }}
                >
                  {w("seriesEnroll")}
                </button>
              )}
              <div className="checkout-footer">
                <div>
                  <p>{quote.data ? t("payNow") : copy("estimatedTotal")}</p>
                  <strong>
                    {quote.data ? (
                      <Price value={quote.data.payNowMinor} />
                    ) : (
                      <Price
                        value={(
                          BigInt(query.data.amountMinor) * BigInt(quantity)
                        ).toString()}
                      />
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
                    incomplete ||
                    (!occurrence &&
                      !["membership", "program"].includes(query.data.kind))
                  }
                  onClick={() => {
                    if (!quote.data) {
                      setAccepted(false);
                      key.current = null;
                      checkout.reset();
                      quote.mutate(
                        {
                          serviceId: service,
                          ...purchaseDetails,
                          occurrenceId: ["membership", "program"].includes(
                            query.data?.kind ?? "",
                          )
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
                        ...purchaseDetails,
                        occurrenceId: ["membership", "program"].includes(
                          query.data?.kind ?? "",
                        )
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
  const w = useTranslations("Workflow");
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
  const payment = useSportsCommand<PaymentAttemptDto>(
    `sports/account/orders/${id}/payment`,
  );
  const verify = useSportsCommand(`sports/account/orders/${id}/verify`);
  const reconcile = useSportsCommand(`sports/account/orders/${id}/query`);
  const [scenario, setScenario] = useState("success");
  const [gatewayError, setGatewayError] = useState(false);
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
  const hasPendingPayment = order?.payments.some((p) =>
    ["pending", "unknown"].includes(p.state),
  );
  return (
    <LumaPage
      title={t("paymentStatus")}
      back="/orders"
      className="payment-page"
    >
      <QueryState query={query}>
        {order && (
          <>
            {order.status === "paid" && (
              <section className="luma-success-state" role="status">
                <span className="luma-success-mark">
                  <Check aria-hidden="true" size={32} strokeWidth={2.5} />
                </span>
                <h2>{t("status.paid")}</h2>
                <p className="luma-meta">{order.snapshot.title}</p>
              </section>
            )}
            <ReservationSummary
              title={order.snapshot.title}
              amountMinor={order.amountMinor}
              state={order.status}
            />
            {order.snapshot.kind === "membership" && (
              <TuitionPlan orderId={id} />
            )}
            {order.snapshot.offering?.confirmation === "before_payment" &&
              !order.coordinationApproved && (
                <p role="status" className="luma-meta">
                  {w("coordinationHint")}
                </p>
              )}
            {!(
              order.snapshot.offering?.confirmation === "before_payment" &&
              !order.coordinationApproved
            ) &&
              ["awaiting_payment", "partially_paid"].includes(order.status) &&
              !(
                order.snapshot.groupId && order.snapshot.kind !== "split_share"
              ) && (
                <>
                  <ReceiptForm orderId={id} />
                  <p className="luma-meta mt-6">{t("sandbox")}</p>
                  <Row title={t("payNow")}>
                    <Price
                      value={order.nextPaymentMinor ?? order.balanceDueMinor}
                    />
                  </Row>
                  <Row title={t("balance")}>
                    <Price value={order.balanceDueMinor} />
                  </Row>
                  {!hasPendingPayment &&
                    order.paymentProvider !== "saman_sandbox" && (
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
                    )}
                  <button
                    className="luma-cta"
                    disabled={payment.isPending}
                    onClick={() => {
                      setGatewayError(false);
                      paymentKey.current ??= crypto.randomUUID();
                      payment.mutate(
                        { scenario, idempotencyKey: paymentKey.current },
                        {
                          onSuccess: (attempt) => {
                            const destination = paymentGatewayDestination(
                              attempt,
                              id,
                            );
                            if (!destination) {
                              setGatewayError(true);
                              return;
                            }
                            try {
                              if (attempt.provider === "saman_sandbox")
                                window.location.assign(destination);
                              else router.push(destination);
                              paymentKey.current = null;
                            } catch {
                              setGatewayError(true);
                            }
                          },
                        },
                      );
                    }}
                  >
                    {payment.isPending ? t("paymentPending") : t("pay")}
                  </button>
                  {hasPendingPayment && (
                    <>
                      <p className="luma-meta mt-6">{t("paymentPending")}</p>
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
            {gatewayError && (
              <p role="alert" className="luma-error">
                {t("actionError")}
              </p>
            )}
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
