"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FormEvent } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { ArrowRepeatClockwise2 } from "@repo/icons/arrow-repeat-clockwise-2";
import { ChatDot } from "@repo/icons/chat-dot";
import { Mobile } from "@repo/icons/mobile";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Input } from "@repo/ui/kit/input";
import {
  AnimatedInputOTP,
  AnimatedInputOTPGroup,
  AnimatedInputOTPSlot,
} from "@repo/ui/kit/input-otp";
import { Label } from "@repo/ui/kit/label";
import { useRetryAfter } from "@repo/ui/lib/use-retry-after";

import { normalizeDigits } from "../../lib/phone";
import { authClasses } from "./auth-classes";
import { AuthHeading } from "./AuthHeading";
import { normalizeIranianMobile, otpLength, submitOtp } from "./otp";

export const OtpForm = () => {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState<string>();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"phone" | "code" | "unavailable">();

  const retry = useRetryAfter(phone ? "verify" : "request");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retry.remaining) return;

    const normalized = phone ?? normalizeIranianMobile(input);
    if (!normalized) {
      setError("phone");
      return;
    }
    if (phone && (code.length !== otpLength || !/^[0-9]+$/.test(code))) {
      setError("code");
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      const response =
        phone ?
          await submitOtp("verify", { phone, code })
        : await submitOtp("request", { phone: normalized });
      if (retry.capture(response)) return;
      if (!response.ok) {
        setError(phone && [400, 401, 422].includes(response.status) ? "code" : "unavailable");
        return;
      }
      if (phone) {
        const result = await response.json().catch(() => ({}));
        router.replace(result.accountComplete === false ? "/auth/complete" : "/");
      } else {
        retry.clear("verify");
        setPhone(normalized);
      }
    } catch {
      setError("unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading
        icon={phone ? ChatDot : Mobile}
        title={t(phone ? "otp.verifyTitle" : "otp.title")}
        description={
          phone ?
            <>
              {t("otp.verifyDescription")}
              <strong className={authClasses.destination}>
                <bdi dir="ltr">{phone}</bdi>
              </strong>
            </>
          : t("otp.description")
        }
      />
      <form
        method="post"
        noValidate
        onSubmit={submit}
        className={authClasses.fields}
        aria-busy={pending}
      >
        {phone ?
          <div className={authClasses.otpCode} data-invalid={error === "code" || undefined}>
            <Label htmlFor="auth-code" className="sr-only">
              {t("code")}
            </Label>
            <AnimatedInputOTP
              id="auth-code"
              dir="ltr"
              placeholder={"–".repeat(otpLength)}
              maxLength={otpLength}
              pattern="^[0-9۰-۹٠-٩]*$"
              pasteTransformer={normalizeDigits}
              autoComplete="one-time-code"
              pushPasswordManagerStrategy="none"
              value={code}
              onChange={(value) => {
                setCode(normalizeDigits(value));
                setError(undefined);
              }}
              aria-invalid={error === "code"}
              aria-describedby={error === "code" ? "otp-error" : undefined}
            >
              <AnimatedInputOTPGroup className={authClasses.otpGroup}>
                {Array.from({ length: otpLength }, (_, index) => (
                  <AnimatedInputOTPSlot key={index} index={index} />
                ))}
              </AnimatedInputOTPGroup>
            </AnimatedInputOTP>
          </div>
        : <div className={authClasses.field} data-invalid={error === "phone" || undefined}>
            <Label htmlFor="auth-phone" className="sr-only">
              {t("otp.phone")}
            </Label>
            <Input
              id="auth-phone"
              size="xl"
              radius="full"
              variant="filled"
              color="neutral"
              type="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={t("otp.phone")}
              className={authClasses.input}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError(undefined);
              }}
              aria-invalid={error === "phone"}
              aria-describedby={error === "phone" ? "otp-error" : undefined}
            />
          </div>
        }
        <AnimatedButton
          type="submit"
          size="xl"
          color="neutral"
          radius="full"
          fullWidth
          disabled={
            pending || retry.remaining > 0 || (phone ? code.length < otpLength : !input.trim())
          }
          className={authClasses.submit}
        >
          {pending && (
            <ArrowRepeatClockwise2
              data-icon="inline-start"
              className={authClasses.spinner}
              aria-hidden
            />
          )}
          {t(phone ? "otp.submit" : "otp.request")}
        </AnimatedButton>
        {retry.remaining > 0 && (
          <p role="status" className={authClasses.error}>
            <span className="sr-only">{t("rateLimitNotice")}</span>
            <span aria-hidden="true">{t("rateLimited", { seconds: retry.remaining })}</span>
          </p>
        )}
        {error && (
          <p id="otp-error" role="alert" className={authClasses.error}>
            {error === "unavailable" ?
              t("unavailable")
            : t(error === "phone" ? "otp.invalidPhone" : "otp.invalidCode")}
          </p>
        )}
        {phone && (
          <AnimatedButton
            type="button"
            variant="text"
            color="neutral"
            radius="full"
            disabled={pending}
            onClick={() => {
              setPhone(undefined);
              setCode("");
              setError(undefined);
            }}
          >
            <ArrowLeft data-icon="inline-start" className="rtl:rotate-180" aria-hidden />
            {t("otp.changePhone")}
          </AnimatedButton>
        )}
      </form>
    </>
  );
};
