"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentGatewayDestination } from "../../lib/payment-gateway";
import {
  useSportsCommand,
  useSportsQuery,
  type OrderDto,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  LumaPage,
  Price,
  QueryState,
  Row,
  useLuma,
} from "./common";

/** The API selects the provider and performs authoritative payment verification. */
export function MockGateway() {
  const t = useLuma();
  const router = useRouter();
  const orderId = useSearchParams().get("order");
  const returnUrl = `/checkout/status?order=${orderId ?? ""}`;
  const order = useSportsQuery<OrderDto>(
    `sports/account/orders/${orderId}`,
    undefined,
    Boolean(orderId),
  );
  const verify = useSportsCommand<OrderDto>(
    `sports/account/orders/${orderId}/verify`,
  );
  const pending = order.data?.payments.find((p) =>
    ["pending", "unknown"].includes(p.state),
  );
  const destination =
    pending && orderId ? paymentGatewayDestination(pending, orderId) : null;
  const gatewayUrl = pending?.provider === "saman_sandbox" ? destination : null;
  const redirected = useRef<string | null>(null);
  useEffect(() => {
    if (!gatewayUrl || redirected.current === gatewayUrl) return;
    redirected.current = gatewayUrl;
    window.location.replace(gatewayUrl);
  }, [gatewayUrl]);
  if (!orderId)
    return (
      <LumaPage title={t("mockGateway")} back="/orders">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={t("mockGateway")} back={returnUrl} actions={<span />}>
      <p className="luma-meta" role="note">
        {t("mockGatewayHelp")}
      </p>
      <Link className="luma-cta" href={returnUrl}>
        {t("returnToOrder")}
      </Link>
      <QueryState query={order}>
        {order.data && (
          <div className="luma-group mt-6">
            <Row title={order.data.snapshot.title} state={order.data.status} />
            <Row title={t("payNow")}>
              <Price
                value={
                  pending?.amountMinor ??
                  order.data.nextPaymentMinor ??
                  order.data.balanceDueMinor
                }
              />
            </Row>
            {gatewayUrl && (
              <p role="status" className="luma-meta">
                {t("paymentPending")}
              </p>
            )}
            {pending && !destination && (
              <p role="alert" className="luma-error">
                {t("actionError")}
              </p>
            )}
            {pending && destination && pending.provider !== "saman_sandbox" && (
              <button
                className="luma-cta"
                disabled={verify.isPending}
                onClick={() =>
                  verify.mutate(
                    {},
                    { onSuccess: () => router.replace(returnUrl) },
                  )
                }
              >
                {verify.isPending ? t("paymentPending") : t("pay")}
              </button>
            )}
            <CommandError error={verify.error} />
          </div>
        )}
      </QueryState>
    </LumaPage>
  );
}
