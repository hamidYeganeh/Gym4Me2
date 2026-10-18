"use client";

import Link from "next/link";
import { useId, type FormEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  Smartphone,
  MessageSquareText,
  KeyRound,
  LoaderCircle,
  X,
} from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { OneTimeCode } from "../kit/OneTimeCode";
import { applicationAuthHref } from "../lib/auth-routes";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { ErrorNotice } from "./common";
import { LoginField, LoginFieldError } from "./login-field";
import {
  loginFieldErrors,
  normalizeLoginDigits as digits,
  type LoginErrors,
} from "./login-validation";
import "./auth-controls.css";

export function AuthScreen({
  title,
  description,
  icon,
  back,
  actions,
  children,
}: {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  back: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main
      data-gym-auth
      className="mobile-auth mx-auto flex min-h-dvh max-w-xl flex-col bg-background px-5 pt-[calc(1.5rem+var(--app-safe-top,0px))] pb-[calc(1.5rem+var(--app-safe-bottom,0px))] sm:px-6"
    >
      <header className="flex min-h-12 items-center justify-between gap-3">
        {back}
        {actions}
      </header>
      <div className="auth-heading flex flex-col items-center gap-5 text-center">
        <div className="auth-emblem flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="max-w-sm text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </main>
  );
}
export function MobileAuth({
  phone,
  setPhone,
  code,
  setCode,
  password,
  setPassword,
  method,
  challenge,
  remaining,
  busy,
  verified,
  codeRejected,
  error,
  fieldErrors,
  recovery,
  submit,
  resend,
  editPhone,
  policy,
  cancelHref,
}: {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  method: "otp" | "password";
  challenge: string | null;
  remaining: number;
  busy: boolean;
  verified: boolean;
  codeRejected: boolean;
  error: string | null;
  fieldErrors: LoginErrors;
  recovery: boolean;
  submit: (event: FormEvent) => void;
  resend: () => void;
  editPhone: () => void;
  policy: ReactNode;
  cancelHref: string;
}) {
  const t = useTranslations();
  const validationCopy = useTranslations("AuthValidation");
  const codeId = useId();
  useOverlayHistory(Boolean(challenge), (open) => {
    if (!open) editPhone();
  });
  const invalid =
    Object.keys(loginFieldErrors({ phone, password, code, challenge, method }))
      .length > 0;
  const disabled =
    busy ||
    invalid ||
    codeRejected ||
    (!challenge && method === "otp" && remaining > 0);
  return (
    <AuthScreen
      title={
        challenge
          ? t("Copy.enterVerificationCode")
          : recovery
            ? t("Password.resetTitle")
            : method === "password"
              ? t("AuthDesign.passwordTitle")
              : t("AuthDesign.phoneTitle")
      }
      description={
        challenge ? (
          <>
            {t("Copy.a5DigitCodeWasSentTo")}
            <br />
            <bdi className="font-medium text-foreground">{phone}</bdi>
            <br />
            {t("Copy.theCodeIsValidForTwoMinutes")}
          </>
        ) : recovery ? (
          t("Password.resetHint")
        ) : method === "password" ? (
          t("Password.loginHint")
        ) : (
          t("Copy.enterYourMobileNumberToReceiveA")
        )
      }
      icon={
        challenge ? (
          <MessageSquareText className="size-7" />
        ) : method === "password" ? (
          <KeyRound className="size-7" />
        ) : (
          <Smartphone className="size-7" />
        )
      }
      back={
        challenge ? (
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-12"
            aria-label={t("Copy.editNumber")}
            disabled={busy}
            onClick={editPhone}
          >
            <ChevronLeft strokeWidth={1.5} className="rtl:rotate-180" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon-lg" asChild className="size-12">
            <Link
              href={
                recovery
                  ? applicationAuthHref("password", cancelHref)
                  : cancelHref
              }
              aria-label={t("Kit.close")}
            >
              <X strokeWidth={1.5} />
            </Link>
          </Button>
        )
      }
      actions={
        !challenge && !recovery ? (
          <Button variant="ghost" asChild>
            <Link href="/discovery">{t("AuthDesign.browse")}</Link>
          </Button>
        ) : undefined
      }
    >
      <form
        key={challenge ? "code" : method}
        noValidate
        onSubmit={submit}
        className="auth-step flex flex-1 flex-col gap-6"
      >
        <FieldGroup>
          {challenge ? (
            <Field
              data-invalid={!!fieldErrors.code || codeRejected || undefined}
              data-disabled={busy || undefined}
            >
              <FieldLabel className="sr-only" htmlFor={codeId}>
                {t("Copy.verificationCode")}
              </FieldLabel>
              <div dir="ltr" className="auth-bencho-code mx-auto">
                <OneTimeCode
                  id={codeId}
                  data-auth-field="code"
                  aria-invalid={!!fieldErrors.code || codeRejected || undefined}
                  aria-describedby={
                    fieldErrors.code
                      ? `${codeId}-error`
                      : codeRejected
                        ? `${codeId}-server-error`
                        : undefined
                  }
                  autoFocus
                  length={5}
                  value={code}
                  onValueChange={setCode}
                  status={
                    verified
                      ? "success"
                      : busy
                        ? "verifying"
                        : codeRejected
                          ? "error"
                          : "idle"
                  }
                  verifiedLabel={t("Luma.status.verified")}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9۰-۹٠-٩]*"
                  disabled={busy}
                />
              </div>
              {fieldErrors.code && (
                <LoginFieldError id={`${codeId}-error`}>
                  {validationCopy(fieldErrors.code)}
                </LoginFieldError>
              )}
            </Field>
          ) : (
            <LoginField
              field="phone"
              label={t("Copy.mobileNumber")}
              hiddenLabel
              error={fieldErrors.phone && validationCopy(fieldErrors.phone)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("Copy.phonePlaceholder")}
              dir="ltr"
              value={phone}
              onChange={(event) => setPhone(digits(event.target.value))}
              disabled={busy}
              maxLength={20}
              required
              autoFocus
            />
          )}
          {!challenge && !recovery && (
            <Button variant="ghost" asChild>
              <Link
                aria-disabled={busy || undefined}
                tabIndex={busy ? -1 : undefined}
                onClick={(event) => {
                  if (busy) event.preventDefault();
                }}
                href={applicationAuthHref(
                  method === "otp" ? "password" : "otp",
                  cancelHref,
                )}
              >
                {t(
                  method === "otp"
                    ? "Password.withPassword"
                    : "Password.withOtp",
                )}
              </Link>
            </Button>
          )}
          {method === "password" && !challenge && (
            <LoginField
              field="password"
              label={t("Password.password")}
              error={
                fieldErrors.password && validationCopy(fieldErrors.password)
              }
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              maxLength={128}
              required
            />
          )}
          {error && (
            <div id={`${codeId}-server-error`}>
              <ErrorNotice error={error} />
            </div>
          )}
        </FieldGroup>
        {challenge && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={editPhone}
            >
              {t("Copy.editNumber")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || remaining > 0}
              onClick={resend}
            >
              {remaining > 0
                ? t("Copy.resendCountdown", { seconds: remaining })
                : t("Copy.resendCode")}
            </Button>
          </div>
        )}
        {method === "password" && !challenge && (
          <Button variant="link" asChild>
            <Link
              href={`/reset-password?${new URLSearchParams({ returnTo: cancelHref })}`}
            >
              {t("Password.forgot")}
            </Link>
          </Button>
        )}
        <div className="mt-auto flex flex-col gap-4 pt-12">
          <Button
            type="submit"
            data-auth-action
            disabled={disabled}
            className="min-h-14 w-full"
          >
            {busy && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            {t("AuthDesign.next")}
          </Button>
          {!challenge && <div className="text-center">{policy}</div>}
        </div>
      </form>
    </AuthScreen>
  );
}
