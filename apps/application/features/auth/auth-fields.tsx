import type { useAuthCopy } from "./auth-copy";
import type { ReactNode } from "react";

import { createApplicantAuth } from "@repo/api/applicant-auth";
import { ApiError } from "@repo/api/http";

export const auth = createApplicantAuth(
  process.env.NEXT_PUBLIC_CLUB_API_ORIGIN ?? "http://localhost:3003",
);

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) & 15));
}

export function normalizePhone(value: string) {
  const national = normalizeDigits(value)
    .replace(/[\s-]/g, "")
    .replace(/^(?:\+98|98|0)/, "");
  return /^9\d{9}$/.test(national) ? `+98${national}` : null;
}

export function errorMessage(
  error: unknown,
  fallback: string,
  copy: ReturnType<typeof useAuthCopy>,
) {
  if (error instanceof ApiError) {
    if (error.status === 429) return copy.rateLimit;
    if (!error.status || error.status >= 500) {
      return copy.unavailable;
    }
  }
  return fallback;
}

export const AuthHeading = (props: { title: string; children: ReactNode; icon?: ReactNode }) => {
  const { title, children, icon } = props;
  return (
    <header className="flex flex-col items-center gap-theme-2 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="mb-theme-3 grid size-theme-16 place-items-center rounded-theme-full bg-theme-muted text-theme-muted-foreground [&>svg]:size-theme-7"
        >
          {icon}
        </span>
      )}
      <h1 className="text-theme-h3 font-theme-semibold">{title}</h1>
      <p className="text-theme-body1 text-theme-muted-foreground">{children}</p>
    </header>
  );
};
