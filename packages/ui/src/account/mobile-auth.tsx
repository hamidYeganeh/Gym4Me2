"use client";

import { useLocale, useTranslations } from "@repo/i18n";
import Link from "next/link";
import { useId, type FormEvent, type ReactNode } from "react";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import {
  ChevronLeftIcon as ChevronLeft,
  Key1Icon as KeyRound,
  ArrowRotateClockwise1Icon as LoaderCircle,
  ChatLineIcon as MessageSquareText,
  MobileIcon as Smartphone,
} from "../icons";
import { Button } from "../kit/Button";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { OneTimeCode } from "../kit/OneTimeCode";
import { SlidingNumber } from "../kit/SlidingNumber";
import { applicationAuthHref } from "../lib/auth-routes";
import "./auth-controls.css";
import { ErrorNotice } from "./common";
import { LoginField, LoginFieldError } from "./login-field";
import {
  normalizeLoginDigits as digits,
  loginFieldErrors,
  type LoginErrors,
} from "./login-validation";

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
  client = "application",
  onMethodChange,
  phone,
  setPhone,
  code,
  setCode,
  password,
  setPassword,
  method,
  challenge,
  remaining,
  expiresIn,
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
  returnTo = cancelHref,
}: {
  client?: "application" | "business" | "admin";
  onMethodChange?: (method: "otp" | "password") => void;
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  method: "otp" | "password";
  challenge: string | null;
  remaining: number;
  expiresIn: number;
  busy: boolean;
  verified: boolean;
  codeRejected: boolean;
  error: unknown;
  fieldErrors: LoginErrors;
  recovery: boolean;
  submit: (event: FormEvent) => void;
  resend: () => void;
  editPhone: () => void;
  policy: ReactNode;
  cancelHref: string;
  returnTo?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
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
    (Boolean(challenge) && expiresIn <= 0) ||
    (!challenge && method === "otp" && remaining > 0);
  return (
    <AuthScreen
      title={
        challenge
          ? t("Copy.enterVerificationCode")
          : recovery
            ? t("Password.resetTitle")
            : client !== "application"
              ? t(
                  client === "admin"
                    ? "Copy.signInToAdmin"
                    : "Copy.signInToBusiness",
                )
              : method === "password"
                ? t("AuthDesign.passwordTitle")
                : t("AuthDesign.phoneTitle")
      }
      description={
        challenge ? (
          <>
            <span className="block">{t("Copy.otpSentTo")}</span>
            <bdi className="mt-1 block font-medium text-foreground">
              {phone}
            </bdi>
            <span
              role="timer"
              data-expired={expiresIn <= 0}
              aria-live="off"
              aria-label={t("Copy.otpRemainingTime", {
                minutes: Math.floor(expiresIn / 60),
                seconds: expiresIn % 60,
              })}
              className="auth-code-timer mt-3 flex items-center justify-center gap-2 text-sm"
            >
              <span>
                {t(expiresIn > 0 ? "Copy.otpValidity" : "Copy.otpExpired")}
              </span>
              <span
                dir="ltr"
                aria-hidden="true"
                className="inline-flex items-center gap-0.5 font-medium text-foreground tabular-nums"
              >
                <SlidingNumber
                  value={Math.floor(expiresIn / 60)}
                  padStart
                  locale={locale}
                />
                <span>:</span>
                <SlidingNumber
                  value={expiresIn % 60}
                  padStart
                  locale={locale}
                />
              </span>
            </span>
            <span className="sr-only" aria-live="polite">
              {expiresIn <= 0 ? t("Copy.otpExpired") : ""}
            </span>
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
                  ? client === "application"
                    ? applicationAuthHref("password", returnTo)
                    : `/login?${new URLSearchParams({ method: "password", returnTo })}`
                  : cancelHref
              }
              aria-label={t("Luma.back")}
            >
              <ChevronLeft className="rtl:rotate-180" />
            </Link>
          </Button>
        )
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
                    fieldErrors.code ? `${codeId}-error` : undefined
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
                  disabled={busy || expiresIn <= 0}
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
          <ErrorNotice error={error} />
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
            <Link href={`/reset-password?${new URLSearchParams({ returnTo })}`}>
              {t("Password.forgot")}
            </Link>
          </Button>
        )}
        <div className="auth-submit-actions mt-auto flex flex-col gap-4 pt-12">
          {client !== "application" && !challenge && (
            <p className="text-center text-sm leading-7 text-muted-foreground">
              {t(
                client === "admin"
                  ? "Copy.onlyAccountsWithPlatformManagementAccessCan"
                  : "Copy.coachesAndAthletesUseOneAccountClub",
              )}
            </p>
          )}
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
      {!challenge && !recovery && (
        <div
          className="mt-6 flex flex-col border-t border-border pt-4"
          data-auth-method-switch
        >
          {client === "application" ? (
            <Button variant="ghost" asChild>
              <Link
                aria-disabled={busy || undefined}
                tabIndex={busy ? -1 : undefined}
                onClick={(event) => {
                  if (busy) event.preventDefault();
                }}
                href={applicationAuthHref(
                  method === "otp" ? "password" : "otp",
                  returnTo,
                )}
              >
                {t(
                  method === "otp"
                    ? "Password.withPassword"
                    : "Password.withOtp",
                )}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                onMethodChange?.(method === "otp" ? "password" : "otp")
              }
            >
              {t(
                method === "otp" ? "Password.withPassword" : "Password.withOtp",
              )}
            </Button>
          )}
        </div>
      )}
    </AuthScreen>
  );
}
