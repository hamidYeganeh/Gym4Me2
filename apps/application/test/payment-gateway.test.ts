import assert from "node:assert/strict";
import test from "node:test";
import { paymentGatewayDestination } from "../lib/payment-gateway";

const order = "11111111-1111-4111-8111-111111111111";
const gateway =
  "https://sandbox.banktest.ir/saman/sep.shaparak.ir/OnlinePG/SendToken?token=issued-by-bank";
const payment = {
  provider: "saman_sandbox",
  state: "pending",
  gatewayUrl: gateway,
};

test("a BankTest attempt goes directly to the bank URL returned by the server", () => {
  assert.equal(paymentGatewayDestination(payment, order), gateway);
  assert.equal(
    paymentGatewayDestination({ ...payment, state: "unknown" }, order),
    gateway,
  );
});

test("missing or untrusted bank URLs cannot fall back to a simulated payment", () => {
  for (const gatewayUrl of [
    undefined,
    null,
    "",
    "/checkout/mock-gateway",
    "javascript:alert(1)",
    gateway.replace("https:", "http:"),
    gateway.replace("sandbox.banktest.ir", "sandbox.banktest.ir.evil.example"),
    gateway.replace("sandbox.banktest.ir", "evil.example"),
    gateway.replace("https://", "https://user:password@"),
    gateway.replace("/SendToken", "/AnotherPage"),
    gateway.replace("?token=issued-by-bank", "?token="),
    gateway + "&token=second-token",
    gateway + "#unexpected",
  ])
    assert.equal(
      paymentGatewayDestination({ ...payment, gatewayUrl }, order),
      null,
    );
  assert.equal(
    paymentGatewayDestination({ ...payment, provider: "other_bank" }, order),
    null,
  );
});

test("verified and failed attempts never reopen the gateway", () => {
  for (const state of ["verified", "failed"])
    assert.equal(paymentGatewayDestination({ ...payment, state }, order), null);
});

test("only explicit local mock attempts use the simulator, even when BankTest is configured for new payments", () => {
  for (const provider of ["saman_mock", "sandbox"])
    assert.equal(
      paymentGatewayDestination({ provider, state: "pending" }, order),
      `/checkout/mock-gateway?order=${order}`,
    );
});
