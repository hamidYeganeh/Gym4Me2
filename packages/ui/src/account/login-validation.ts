export const normalizeLoginDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));

// Keep accepted formats aligned with auth.contracts.ts on the server.
export const normalizeLoginPhone = (value: string) =>
  normalizeLoginDigits(value)
    .replace(/[\s()-]/g, "")
    .replace(/^0098/, "+98")
    .replace(/^09/, "+989");

export type LoginFieldName = "phone" | "password" | "code";
export type LoginError =
  | "phoneRequired"
  | "phoneInvalid"
  | "passwordRequired"
  | "passwordTooLong"
  | "codeInvalid";
export type LoginErrors = Partial<Record<LoginFieldName, LoginError>>;

export function loginFieldErrors({
  phone,
  password,
  code,
  challenge,
  method,
}: {
  phone: string;
  password: string;
  code: string;
  challenge: string | null;
  method: "otp" | "password";
}): LoginErrors {
  if (challenge)
    return /^\d{5}$/.test(normalizeLoginDigits(code))
      ? {}
      : { code: "codeInvalid" };
  const errors: LoginErrors = {};
  if (!phone.trim()) errors.phone = "phoneRequired";
  else if (!/^\+989\d{9}$/.test(normalizeLoginPhone(phone)))
    errors.phone = "phoneInvalid";
  if (method === "password") {
    // Spaces are significant in an existing password, as on the server.
    if (!password) errors.password = "passwordRequired";
    else if (password.length > 128) errors.password = "passwordTooLong";
  }
  return errors;
}
