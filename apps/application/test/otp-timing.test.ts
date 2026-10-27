import assert from "node:assert/strict";
import test from "node:test";
import {
  otpDeadlines,
  otpSecondsRemaining,
} from "../../../packages/ui/src/account/otp-timing";

test("resend becomes available after one minute while the code stays valid for two", () => {
  const start = 1_000_000;
  const timing = otpDeadlines({ expiresIn: 120, retryAfter: 60 }, start);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start), 120);
  assert.equal(otpSecondsRemaining(timing.resendAt, start), 60);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start + 60_000), 60);
  assert.equal(otpSecondsRemaining(timing.resendAt, start + 60_000), 0);
});

test("backgrounding and delivery latency do not restart or extend validity", () => {
  const start = 1_000_000;
  const timing = otpDeadlines({ expiresIn: 120, retryAfter: 60 }, start);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start + 5_000), 115);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start + 119_001), 1);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start + 120_000), 0);
  assert.equal(otpSecondsRemaining(timing.expiresAt, start + 300_000), 0);
  const delayed = otpDeadlines(
    { expiresIn: 120, retryAfter: 60 },
    start,
    start + 5_000,
  );
  assert.equal(otpSecondsRemaining(delayed.expiresAt, start + 5_000), 115);
  assert.equal(otpSecondsRemaining(delayed.resendAt, start + 5_000), 60);
});

test("a newly issued code gets independent deadlines from the API response", () => {
  const start = 1_000_000;
  const next = otpDeadlines({ expiresIn: 120, retryAfter: 30 }, start + 90_000);
  assert.equal(otpSecondsRemaining(next.expiresAt, start + 90_000), 120);
  assert.equal(otpSecondsRemaining(next.resendAt, start + 90_000), 30);
  assert.equal(
    otpDeadlines({ retryAfter: 60 }, start).expiresAt,
    start + 120_000,
  );
});
