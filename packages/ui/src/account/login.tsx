"use client";
import { useTranslations } from "@repo/i18n";

import { useRequestOtp, useVerifyOtp, usePasswordLogin } from "@repo/api/auth";
import { ApiError, type ApiApplication as Client } from "@repo/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";
import {
  loginFieldErrors,
  normalizeLoginDigits as digits,
  type LoginFieldName,
} from "./login-validation";
import { MobileAuth } from "./mobile-auth";
import { useOtpAutofill } from "./otp-autofill";
import { safeReturnPath } from "./safe-return-path";
import { loginDestination } from "./login-destination";
import "./auth-controls.css";
function restoreFailedLoginFocus(origin: Element | null) {
  requestAnimationFrame(() => {
    if (!(origin instanceof HTMLElement) || !isActiveSurfaceElement(origin))
      return;
    const main = origin.closest("main[data-gym-auth]");
    if (!main) return;
    if (
      !origin.matches(":disabled") &&
      document.activeElement === document.body
    )
      origin.focus({ preventScroll: true });
    const current = document.activeElement;
    if (
      current instanceof HTMLElement &&
      main.contains(current) &&
      isActiveSurfaceElement(current) &&
      current.matches(":focus-visible")
    ) {
      const rect = current.getBoundingClientRect();
      if (
        rect.top < 8 ||
        rect.left < 8 ||
        rect.bottom > innerHeight - 8 ||
        rect.right > innerWidth - 8
      )
        current.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
    }
  });
}
export function LoginPage({
  client,
  recovery = false,
  initialMethod = "otp",
}: {
  client: Client;
  recovery?: boolean;
  initialMethod?: "otp" | "password";
}) {
  const t = useTranslations();

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const passwordLogin = usePasswordLogin();
  const [method, setMethod] = useState<"otp" | "password">(initialMethod);
  const [password, setPassword] = useState("");

  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const autofill = useOtpAutofill(setCode);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [codeRejected, setCodeRejected] = useState(false);
  const pending = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const changeCode = useCallback((value: string) => {
    setCode(value);
    setError(null);
    setAttempted(false);
    setCodeRejected(false);
  }, []);
  const fieldErrors = attempted
    ? loginFieldErrors({ phone, password, code, challenge, method })
    : {};
  const [returnPath, setReturnPath] = useState("/");
  useEffect(() => {
    setReturnPath(
      safeReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
        "/",
      ),
    );
  }, [client, recovery]);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function requestCode() {
    if (pending.current) return;
    const origin = document.activeElement;
    pending.current = true;
    setAttempted(false);
    setBusy(true);
    setError(null);
    setCodeRejected(false);
    try {
      setCode("");
      await autofill.begin();
      const result = await requestOtp.mutateAsync({ phone: digits(phone) });
      setChallenge(result.challengeId);
      setDeadline(Date.now() + result.retryAfter * 1000);
    } catch (err) {
      autofill.stop();
      restoreFailedLoginFocus(origin);
      setError(err instanceof Error ? err.message : "Copy.couldNotSendCode");
      if (err instanceof ApiError && err.status === 429)
        setDeadline(Date.now() + 60000);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const origin = document.activeElement;
    const errors = loginFieldErrors({
      phone,
      password,
      code,
      challenge,
      method,
    });
    setAttempted(true);
    setError(null);
    const first = Object.keys(errors)[0] as LoginFieldName | undefined;
    if (first) {
      const form = event.currentTarget as HTMLFormElement;
      requestAnimationFrame(() => {
        if (
          isActiveSurfaceElement(form) &&
          (document.activeElement === origin ||
            document.activeElement === document.body)
        )
          form
            .querySelector<HTMLInputElement>(`[data-auth-field="${first}"]`)
            ?.focus();
      });
      return;
    }
    if (!challenge && method === "otp") return requestCode();
    if (!challenge && method === "password") {
      pending.current = true;
      setBusy(true);
      setError(null);
      try {
        const verified = await passwordLogin.mutateAsync({
          phone: digits(phone),
          password,
        });
        setAttempted(false);
        setPassword("");
        router.replace(
          loginDestination({
            client,
            returnTo: returnPath,
            recovery,
            displayName: verified.user.displayName,
          }),
        );
      } catch (err) {
        restoreFailedLoginFocus(origin);
        setError(err instanceof Error ? err.message : "Copy.couldNotSignIn");
        pending.current = false;
        setBusy(false);
      }
      return;
    }
    if (!challenge) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const verified = await verifyOtp.mutateAsync({
        challengeId: challenge,
        code,
      });
      setVerified(true);
      autofill.stop();
      router.replace(
        loginDestination({
          client,
          returnTo: returnPath,
          recovery,
          displayName: verified.user.displayName,
        }),
      );
    } catch (err) {
      restoreFailedLoginFocus(origin);
      setError(err instanceof Error ? err.message : "Copy.couldNotSignIn");
      setCodeRejected(
        err instanceof ApiError && (err.status === 400 || err.status === 401),
      );
      pending.current = false;
      setBusy(false);
    }
  }
  const policyNotice = (
    <p className="text-sm leading-7 text-muted-foreground">
      {t("Privacy.loginNotice")}{" "}
      <Link
        href={`/privacy?${new URLSearchParams({ from: "login", method, returnTo: returnPath, ...(recovery ? { recovery: "true" } : {}) })}`}
        className="inline-flex min-h-11 items-center justify-center underline underline-offset-4"
      >
        {t("Privacy.readPolicy")}
      </Link>
    </p>
  );
  return (
    <MobileAuth
      client={client}
      onMethodChange={(value) => {
        setMethod(value);
        setAttempted(false);
        setError(null);
        setPassword("");
      }}
      phone={phone}
      setPhone={setPhone}
      code={code}
      setCode={changeCode}
      password={password}
      setPassword={setPassword}
      method={method}
      challenge={challenge}
      remaining={remaining}
      busy={busy}
      verified={verified}
      codeRejected={codeRejected}
      error={error}
      fieldErrors={fieldErrors}
      recovery={recovery}
      submit={submit}
      resend={() => void requestCode()}
      editPhone={() => {
        autofill.stop();
        setChallenge(null);
        setCodeRejected(false);
        setVerified(false);
        setAttempted(false);
        setCode("");
        setError(null);
      }}
      policy={policyNotice}
      cancelHref={returnPath}
    />
  );
}
