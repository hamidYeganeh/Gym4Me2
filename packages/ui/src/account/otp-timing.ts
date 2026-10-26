/** Absolute deadlines keep SMS validity separate from the resend cooldown. */
export function otpDeadlines(
  response: { expiresIn?: number; retryAfter: number },
  requestedAt: number,
  receivedAt = requestedAt,
) {
  return {
    expiresAt: requestedAt + (response.expiresIn ?? 120) * 1000,
    resendAt: receivedAt + response.retryAfter * 1000,
  };
}

export function otpSecondsRemaining(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
