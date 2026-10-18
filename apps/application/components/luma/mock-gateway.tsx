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

/** A local handoff only: the API performs the authoritative payment verification. */
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
  const pending = order.data?.payments.some((p) => p.state === "pending");
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
              <Price value={order.data.balanceDueMinor} />
            </Row>
            {pending && (
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
