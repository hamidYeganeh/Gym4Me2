"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import type { FormEvent } from "react";

import { ApiError } from "@repo/api/http";
import { useTranslations } from "@repo/i18n";
import { Key1 } from "@repo/icons/key-1";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { useRetryAfter } from "@repo/ui/lib/use-retry-after";

import { useAuthCopy } from "./auth-copy";
import { auth, AuthHeading, errorMessage, normalizeDigits, normalizePhone } from "./auth-fields";
import styles from "./auth-screen.module.css";
import { SignedIn } from "./AuthView";
import { useResetPhone } from "./ResetPhoneProvider";
import { readToken, subscribe, writeToken } from "./session";

type Mode = "login" | "forgot-password" | "set-password";

const PasswordForm = (props: { mode: Mode }) => {
  const t = useTranslations("Application");

  const modes = {
    login: {
      title: t("signInWithPassword"),
      description: t("useYourMobileNumberToSignInToGym4Me"),
      submit: t("signIn"),
      fallback: t("theMobileNumberOrPasswordIsIncorrect"),
    },
    "forgot-password": {
      title: t("forgotYourPassword"),
      description: t(
        "enterYourMobileNumberToRequestAResetCodeForAPanelAccountResetYourPasswordFromThatPanel",
      ),
      submit: t("sendResetCode"),
      fallback: t("weCouldntSendAResetCodePleaseTryAgain"),
    },
    "set-password": {
      title: t("setANewPassword"),
      description: t("enterTheSixdigitResetCodeAndChooseANewPassword"),
      submit: t("savePassword"),
      fallback: t("theResetCodeIsIncorrectOrHasExpired"),
    },
  };
  const { mode } = props;
  const authCopy = useAuthCopy();
  const router = useRouter();
  const resetPhone = useResetPhone();
  const [phone, setPhone] = useState(mode === "login" ? "" : resetPhone.phone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const retry = useRetryAfter(mode);
  const isLogin = mode === "login";
  const isReset = mode === "set-password";
  const copy = modes[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retry.remaining) return;
    setError("");

    const values = new FormData(event.currentTarget);
    const number = normalizePhone(phone);
    const password = String(values.get("password") ?? "");
    const code = normalizeDigits(String(values.get("code") ?? "")).trim();
    if (!number) {
      setError(t("enterAValidIranianMobileNumber"));
      return;
    }
    if (isReset && !/^\d{6}$/.test(code)) {
      setError(t("enterTheSixdigitResetCode"));
      return;
    }

    setPending(true);
    try {
      if (isLogin) {
        const { token } = await auth.login({ phone: number, password });
        writeToken(token);
      } else if (isReset) {
        await auth.resetPassword({ phone: number, code, password });
        writeToken(null);
        resetPhone.setPhone("");
        router.replace("/auth/login");
      } else {
        await auth.requestPasswordReset({ phone: number });
        resetPhone.setPhone(phone);
        router.push("/auth/set-password");
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        retry.defer(cause.retryAfter ?? 60);
      }
      const fallback =
        isReset && cause instanceof ApiError && cause.status === 400 ?
          t("requestANewCodeOrResetYourPasswordFromYourPanel")
        : copy.fallback;
      setError(errorMessage(cause, fallback, authCopy));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`flex flex-col gap-theme-5 ${styles.screen}`}>
      <AuthHeading title={copy.title} icon={<Key1 />}>
        {copy.description}
      </AuthHeading>
      <form
        method="post"
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-theme-4"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="auth-phone">{t("mobileNumber")}</FieldLabel>
            <Input
              id="auth-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0912 345 6789"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              variant="filled"
              size="xl"
              radius="full"
              color="neutral"
              maxLength={40}
              disabled={pending}
              required
            />
          </Field>
          {isReset && (
            <Field>
              <FieldLabel htmlFor="reset-code">{t("resetCode")}</FieldLabel>
              <Input
                id="reset-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                variant="filled"
                size="xl"
                radius="full"
                color="neutral"
                disabled={pending}
                required
              />
            </Field>
          )}
          {(isLogin || isReset) && (
            <Field>
              <FieldLabel htmlFor="auth-password">
                {isReset ? t("newPassword") : t("password")}
              </FieldLabel>
              <Input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={isReset ? "new-password" : "current-password"}
                minLength={isReset ? 8 : undefined}
                maxLength={256}
                placeholder={isReset ? t("atLeast8Characters") : undefined}
                variant="filled"
                size="xl"
                radius="full"
                color="neutral"
                disabled={pending}
                required
              />
            </Field>
          )}
        </FieldGroup>
        {error && (
          <p role="alert" className="text-theme-body2 text-theme-error">
            {error}
          </p>
        )}
        {retry.remaining > 0 && (
          <p role="status" className="text-theme-body2">
            {authCopy.retryIn(retry.remaining)}
          </p>
        )}
        <Button type="submit" size="xl" radius="full" disabled={pending || retry.remaining > 0}>
          {pending ? t("pleaseWait") : copy.submit}
        </Button>
      </form>
      <nav
        aria-label={t("signinOptions")}
        className="flex flex-wrap justify-center gap-x-theme-5 gap-y-theme-2 text-theme-body2 font-theme-medium"
      >
        {isLogin ?
          <>
            <Link className="underline" href="/auth/forgot-password">
              {t("forgotPassword")}
            </Link>
            <Link className="underline" href="/auth/otp">
              {t("useASigninCode")}
            </Link>
          </>
        : <>
            {isReset && (
              <Link className="underline" href="/auth/forgot-password">
                {t("requestANewCode")}
              </Link>
            )}
            <Link className="underline" href="/auth/login">
              {t("backToSignIn")}
            </Link>
          </>
        }
      </nav>
    </div>
  );
};

const PasswordView = (props: { mode: Mode }) => {
  const { mode } = props;
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  return token && mode === "login" ? <SignedIn token={token} /> : <PasswordForm mode={mode} />;
};

export default PasswordView;
