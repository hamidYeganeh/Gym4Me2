export const otpLength = 6;

export { normalizeIranianMobile } from "../../lib/phone";

export async function submitOtp(
  action: "request" | "verify",
  payload: { phone: string; code?: string },
) {
  const response = await fetch(`/api/auth/otp/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response;
}
