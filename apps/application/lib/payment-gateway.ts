import type { PaymentAttemptDto } from "@repo/api/sports";

/** The API owns the attempt and merchant; only its supported gateway may open. */
export function paymentGatewayDestination(
  payment: Pick<PaymentAttemptDto, "provider" | "state" | "gatewayUrl">,
  orderId: string,
): string | null {
  if (!["pending", "unknown"].includes(payment.state)) return null;
  if (["saman_mock", "sandbox"].includes(payment.provider))
    return `/checkout/mock-gateway?order=${encodeURIComponent(orderId)}`;
  if (payment.provider !== "saman_sandbox" || !payment.gatewayUrl) return null;
  try {
    const url = new URL(payment.gatewayUrl);
    if (
      url.origin !== "https://sandbox.banktest.ir" ||
      url.pathname !== "/saman/sep.shaparak.ir/OnlinePG/SendToken" ||
      url.username ||
      url.password ||
      url.hash ||
      url.searchParams.size !== 1 ||
      !url.searchParams.get("token")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
