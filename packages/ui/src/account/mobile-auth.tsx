"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import {
  ChevronLeft,
  Smartphone,
  MessageSquareText,
  KeyRound,
  LoaderCircle,
} from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../kit/InputOtp";
import { ToggleGroup, ToggleGroupItem } from "../kit/ToggleGroup";
import { ErrorNotice } from "./common";

const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));
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
    <main className="mobile-auth mx-auto flex min-h-dvh max-w-xl flex-col bg-background px-5 pt-[calc(1.5rem+var(--app-safe-top,0px))] pb-[calc(1.5rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header className="flex min-h-12 items-center justify-between gap-3">
        {back}
        {actions}
      </header>
      <div className="flex flex-col items-center gap-5 pb-8 pt-8 text-center sm:pt-10">
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
  setMethod,
  challenge,
  remaining,
  busy,
  error,
  recovery,
  submit,
  resend,
  editPhone,
  policy,
}: {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  method: "otp" | "password";
  setMethod: (value: "otp" | "password") => void;
  challenge: string | null;
  remaining: number;
  busy: boolean;
  error: string | null;
  recovery: boolean;
  submit: (event: FormEvent) => void;
  resend: () => void;
  editPhone: () => void;
  policy: ReactNode;
}) {
  const t = useTranslations();
  const normalizedPhone = digits(phone)
    .replace(/[\s()-]/g, "")
    .replace(/^0098/, "+98")
    .replace(/^09/, "+989");
  const validPhone = /^\+989\d{9}$/.test(normalizedPhone);
  const disabled =
    busy ||
    (challenge
      ? code.length !== 5
      : !validPhone ||
        (method === "otp" && remaining > 0) ||
        (method === "password" && !password));
  return (
    <AuthScreen
      title={
        challenge
          ? t("Copy.enterVerificationCode")
          : recovery
            ? t("Password.resetTitle")
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
            variant="outline"
            size="icon-lg"
            className="size-12"
            aria-label={t("Copy.editNumber")}
            disabled={busy}
            onClick={editPhone}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
        ) : (
          <Button variant="outline" size="icon-lg" asChild className="size-12">
            <Link
              href={recovery ? "/login" : "/profile"}
              aria-label={t("Privacy.back")}
            >
              <ChevronLeft className="rtl:rotate-180" />
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
      <form onSubmit={submit} className="flex flex-1 flex-col gap-6">
        <FieldGroup>
          {challenge ? (
            <Field>
              <FieldLabel className="sr-only" htmlFor="mobile-auth-code">
                {t("Copy.verificationCode")}
              </FieldLabel>
              <div
                dir="ltr"
                className="auth-code mx-auto rounded-4xl bg-muted px-5 py-3"
              >
                <InputOTP
                  id="mobile-auth-code"
                  autoFocus
                  maxLength={5}
                  value={code}
                  onChange={(value) => setCode(digits(value))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9۰-۹٠-٩]*"
                  pasteTransformer={digits}
                  disabled={busy}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <InputOTPSlot index={index} key={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </Field>
          ) : (
            <Field>
              <FieldLabel className="sr-only" htmlFor="mobile-auth-phone">
                {t("Copy.mobileNumber")}
              </FieldLabel>
              <Input
                id="mobile-auth-phone"
                name="phone"
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
              />
            </Field>
          )}
          {!challenge && !recovery && (
            <ToggleGroup
              type="single"
              value={method}
              onValueChange={(value) => {
                if (value === "otp" || value === "password") setMethod(value);
              }}
              disabled={busy}
              aria-label={t("Password.method")}
              className="w-full justify-center"
            >
              <ToggleGroupItem value="otp">
                {t("Password.withOtp")}
              </ToggleGroupItem>
              <ToggleGroupItem value="password">
                {t("Password.withPassword")}
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          {method === "password" && !challenge && (
            <Field>
              <FieldLabel htmlFor="mobile-auth-password">
                {t("Password.password")}
              </FieldLabel>
              <Input
                id="mobile-auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
                maxLength={128}
                required
              />
            </Field>
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
            <Link href="/reset-password">{t("Password.forgot")}</Link>
          </Button>
        )}
        <div className="mt-auto flex flex-col gap-4 pt-12">
          <Button type="submit" disabled={disabled} className="min-h-14 w-full">
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
