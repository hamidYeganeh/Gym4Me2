"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  if (!orderId)
    return (
      <LumaPage title={t("mockGateway")} back="/orders">
        <Empty />
      </LumaPage>
    );
  const pending = order.data?.payments.find((p) =>
    ["pending", "unknown"].includes(p.state),
  );
  const gatewayUrl =
    pending?.provider === "saman_sandbox" &&
    pending.gatewayUrl &&
    isBankTestUrl(pending.gatewayUrl)
      ? pending.gatewayUrl
      : null;
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
                value={pending?.amountMinor ?? order.data.balanceDueMinor}
              />
            </Row>
            {gatewayUrl && (
              <a className="luma-cta" href={gatewayUrl} rel="noreferrer">
                {t("openMockGateway")}
              </a>
            )}
            {pending && pending.provider !== "saman_sandbox" && (
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

function isBankTestUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://sandbox.banktest.ir" &&
      url.pathname === "/saman/sep.shaparak.ir/OnlinePG/SendToken" &&
      Boolean(url.searchParams.get("token"))
    );
  } catch {
    return false;
  }
}
