"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { FormEvent } from "react";

import { ApiError } from "@repo/api/http";
import { useMutation, useQuery } from "@repo/api/react-query";
import { useTranslations } from "@repo/i18n";
import { ChatDot } from "@repo/icons/chat-dot";
import { CheckCircle } from "@repo/icons/check-circle";
import { ExclamationMarkTriangle } from "@repo/icons/exclamation-mark-triangle";
import { Mobile } from "@repo/icons/mobile";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import {
  AnimatedInputOTP,
  AnimatedInputOTPGroup,
  AnimatedInputOTPSlot,
} from "@repo/ui/kit/input-otp/animated";
import { useRetryAfter } from "@repo/ui/lib/use-retry-after";
import { cn } from "@repo/ui/lib/utils";

import { useAuthCopy } from "./auth-copy";
import { auth, AuthHeading, errorMessage, normalizeDigits, normalizePhone } from "./auth-fields";
import styles from "./auth-screen.module.css";
import { readToken, subscribe, writeToken } from "./session";

const codeLength = 6;
type Step = "phone" | "code";

export const AuthForm = (props: { locale?: "fa" | "en"; standalone?: boolean }) => {
  const { standalone = false } = props;
  const copy = useAuthCopy();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [challengePhone, setChallengePhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const send = useMutation({ mutationFn: auth.requestCode });
  const confirm = useMutation({ mutationFn: auth.confirmCode, gcTime: 0 });
  const verifyRetry = useRetryAfter(step);
  const pending = send.isPending || confirm.isPending;
  const verifying = step === "code";
  const codeInput = useRef<HTMLInputElement>(null);
  const hasChangedStep = challengePhone !== "";
  useEffect(() => {
    if (verifying) codeInput.current?.focus();
  }, [verifying]);
  const sendRetry = useRetryAfter((verifying ? challengePhone : normalizePhone(phone)) ?? "");
  const remaining = step === "phone" ? sendRetry.remaining : verifyRetry.remaining;

  function changeStep(next: Step) {
    setStep(next);
    setCode("");
    setError("");
    setInvalid(false);
  }

  async function sendCode(number: string) {
    try {
      await send.mutateAsync({ phone: number });
      sendRetry.defer(60);
      setChallengePhone(number);
      changeStep("code");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        sendRetry.defer(cause.retryAfter ?? 60);
      }
      setError(errorMessage(cause, copy.sendError, copy));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || remaining) return;

    setError("");
    setInvalid(false);
    const number = verifying ? challengePhone : normalizePhone(phone);
    if (!number) {
      setInvalid(true);
      setError(copy.phoneError);
      return;
    }
    if (step === "phone") {
      await sendCode(number);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setInvalid(true);
      setError(copy.codeError);
      return;
    }
    try {
      const { token } = await confirm.mutateAsync({ phone: number, code });
      writeToken(token);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        verifyRetry.defer(cause.retryAfter ?? 60);
      }
      const rejected = cause instanceof ApiError && cause.status === 401;
      setInvalid(rejected);
      if (rejected) setCode("");
      setError(errorMessage(cause, copy.verifyError, copy));
    }
  }

  const title = verifying ? copy.codeTitle : copy.phoneTitle;
  const stepClass = hasChangedStep ? styles.step : undefined;
  return (
    <div className={cn("flex flex-col gap-theme-6", standalone && styles.screen)}>
      <div key={step} className={stepClass} data-backwards={step === "phone" || undefined}>
        <AuthHeading title={title} icon={verifying ? <ChatDot /> : <Mobile />}>
          {verifying ?
            <>
              {copy.codeHint} <bdi>{challengePhone}</bdi>.
            </>
          : copy.phoneHint}
        </AuthHeading>
      </div>
      <form
        method="post"
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-theme-4"
      >
        <FieldGroup key={step} className={stepClass} data-backwards={step === "phone" || undefined}>
          {verifying ?
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor="auth-code" className={standalone ? "sr-only" : undefined}>
                {copy.codeLabel}
              </FieldLabel>
              <AnimatedInputOTP
                ref={codeInput}
                id="auth-code"
                placeholder="——————"
                dir="ltr"
                maxLength={codeLength}
                value={code}
                onChange={(value) => setCode(normalizeDigits(value).replace(/\D/g, ""))}
                pasteTransformer={(value) => normalizeDigits(value).replace(/\D/g, "")}
                autoComplete="one-time-code"
                inputMode="numeric"
                aria-invalid={invalid}
                aria-describedby={invalid ? "auth-error" : undefined}
                disabled={pending}
                containerClassName="w-full justify-center"
              >
                <AnimatedInputOTPGroup className="max-w-full rounded-theme-2xl bg-theme-muted px-theme-2 py-theme-1">
                  {Array.from({ length: codeLength }, (_, index) => (
                    <AnimatedInputOTPSlot
                      key={index}
                      index={index}
                      className="min-w-0 shrink border-0 bg-transparent text-theme-h5 tabular-nums data-[active=true]:rounded-theme-sm"
                    />
                  ))}
                </AnimatedInputOTPGroup>
              </AnimatedInputOTP>
            </Field>
          : <Field data-invalid={invalid}>
              <FieldLabel htmlFor="auth-phone" className={standalone ? "sr-only" : undefined}>
                {copy.phoneLabel}
              </FieldLabel>
              <Input
                id="auth-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                variant="filled"
                color="neutral"
                size="xl"
                radius="full"
                placeholder={copy.phonePlaceholder}
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-invalid={invalid}
                aria-describedby={invalid ? "auth-error" : undefined}
                maxLength={40}
                disabled={pending}
                required
              />
            </Field>
          }
        </FieldGroup>
        {error && (
          <p
            id="auth-error"
            role="alert"
            className={cn(
              styles.feedback,
              "flex items-center gap-theme-2 rounded-theme-2xl bg-theme-error px-theme-4 py-theme-3 text-theme-body2 text-theme-error-foreground",
            )}
          >
            <ExclamationMarkTriangle className="size-theme-5 shrink-0" />
            {error}
          </p>
        )}
        {remaining > 0 && (
          <p role="status" className="text-theme-body2">
            {copy.retryIn(remaining)}
          </p>
        )}
        {verifying && (
          <div className="flex flex-wrap items-center justify-between gap-theme-2">
            <Button
              type="button"
              variant="text"
              disabled={pending}
              onClick={() => changeStep("phone")}
            >
              {copy.edit}
            </Button>
            <Button
              type="button"
              variant="text"
              disabled={pending || sendRetry.remaining > 0}
              onClick={() => {
                setError("");
                setInvalid(false);
                void sendCode(challengePhone);
              }}
            >
              {sendRetry.remaining > 0 ? copy.resendIn(sendRetry.remaining) : copy.resend}
            </Button>
          </div>
        )}
        <Button
          type="submit"
          size="xl"
          radius="full"
          disabled={
            pending ||
            remaining > 0 ||
            (standalone && (verifying ? code.length !== codeLength : !normalizePhone(phone)))
          }
        >
          {pending ?
            copy.wait
          : verifying ?
            copy.verify
          : copy.send}
        </Button>
      </form>
    </div>
  );
};

export const SignedIn = (props: { token: string }) => {
  const t = useTranslations("Application");

  const { token } = props;
  const session = useQuery({
    queryKey: ["applicant-session", token],
    queryFn: ({ signal }) => auth.session(token, signal),
    retry: false,
    gcTime: 0,
  });
  const logout = useMutation({
    mutationFn: () => auth.logout(token),
    onSuccess: () => writeToken(null),
  });

  if (session.error instanceof ApiError && [401, 403].includes(session.error.status ?? 0)) {
    return (
      <div className="flex flex-col gap-theme-6">
        <AuthHeading title={t("sessionExpired")}>{t("signInAgainToContinue")}</AuthHeading>
        <Button size="xl" onClick={() => writeToken(null)}>
          {t("signInAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-theme-6">
      {session.isPending ?
        <p role="status">{t("checkingYourSession")}</p>
      : session.isError ?
        <>
          <AuthHeading title={t("sessionError")}>{t("tryAgainToContinue")}</AuthHeading>
          <Button onClick={() => void session.refetch()} disabled={session.isFetching}>
            {t("tryAgain")}
          </Button>
        </>
      : <>
          <AuthHeading title={t("signedIn")} icon={<CheckCircle />}>
            {t("yourGym4MeAccountIsReady")}
          </AuthHeading>
          <Button asChild size="xl">
            <Link href="/onboarding/">{t("setUpYourProfile")}</Link>
          </Button>
          <Button asChild variant="text" color="neutral">
            <Link href="/">{t("continueToGym4Me")}</Link>
          </Button>
        </>
      }
      <Button
        type="button"
        variant="text"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {logout.isPending ? t("signingOut") : t("signOut")}
      </Button>
      {logout.isError && (
        <p role="alert" className="text-theme-body2 text-theme-error">
          {t("couldntSignYouOutPleaseTryAgain")}
        </p>
      )}
    </div>
  );
};

const AuthView = () => {
  const t = useTranslations("Application");

  const token = useSyncExternalStore(subscribe, readToken, () => null);
  return token ?
      <SignedIn token={token} />
    : <div className="flex flex-1 flex-col gap-theme-2">
        <AuthForm standalone />
        <Button asChild variant="text" color="neutral">
          <Link href="/auth/login">{t("signInWithPassword")}</Link>
        </Button>
      </div>;
};

export default AuthView;
