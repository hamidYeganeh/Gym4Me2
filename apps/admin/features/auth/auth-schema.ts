import { z } from "zod";

import { normalizeDigits, normalizeIranianMobile } from "../../lib/phone";

export const minimumPasswordLength = 8;

type ValidationMessages = {
  phone: string;
  code: string;
  password: string;
  minimumPassword: string;
};

export function createAuthSchema(
  mode: "login" | "forgotPassword" | "setPassword",
  messages: ValidationMessages,
) {
  const phone = z
    .string()
    .trim()
    .refine((value) => Boolean(normalizeIranianMobile(value)), messages.phone);
  const password = z.string().min(1, messages.password);
  const newPassword = z.string().min(minimumPasswordLength, messages.minimumPassword);

  return z.object({
    code:
      mode === "setPassword" ?
        z
          .string()
          .transform(normalizeDigits)
          .pipe(z.string().regex(/^[0-9]{6}$/, messages.code))
      : z.string(),
    phone: mode === "setPassword" ? z.string() : phone,
    password:
      mode === "setPassword" ? newPassword
      : mode === "login" ? password
      : z.string(),
  });
}
