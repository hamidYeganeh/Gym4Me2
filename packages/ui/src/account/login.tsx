"use client";
import { Logo } from "@repo/theme/logo";
import { useTranslations, useLocale, getDirection } from "@repo/i18n";

import { useRequestOtp, useVerifyOtp, usePasswordLogin } from "@repo/api/auth";
import { ApiError, type ApiApplication as Client } from "@repo/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/kit/Field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/kit/InputOtp";

import { ErrorNotice, Submit } from "./common";
import { LoginField, LoginFieldError } from "./login-field";
import {
  loginFieldErrors,
  normalizeLoginDigits as digits,
  type LoginFieldName,
} from "./login-validation";
import { MobileAuth } from "./mobile-auth";
import { useOtpAutofill } from "./otp-autofill";
import { safeReturnPath } from "./safe-return-path";
import { loginDestination } from "./login-destination";
import { passwordRecoveryHref } from "../lib/session-navigation";
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
  const authCopy = useTranslations("Password");
  const validationCopy = useTranslations("AuthValidation");
  const locale = useLocale();

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
  const codeId = useId();
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
  const business = client === "business";
  const admin = client === "admin";
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
  const form = (
    <Card
      className={
        client === "application"
          ? "w-full bg-transparent py-4 shadow-none ring-0"
          : "mx-auto w-full max-w-md py-8 shadow-sm"
      }
    >
      <CardHeader className={client === "application" ? "gap-3 px-0" : "gap-3"}>
        <Smartphone className="mb-3 size-8 text-primary" />
        <CardTitle className="text-2xl">
          <h1>
            {recovery
              ? authCopy("resetTitle")
              : challenge
                ? t("Copy.enterVerificationCode")
                : admin
                  ? t("Copy.signInToAdmin")
                  : business
                    ? t("Copy.signInToBusiness")
                    : t("Copy.welcomeToGym4me")}
          </h1>
        </CardTitle>
        <CardDescription className="leading-7">
          {challenge ? (
            <>
              {t("Copy.a5DigitCodeWasSentTo")} <bdi>{phone}</bdi>{" "}
              {t("Copy.theCodeIsValidForTwoMinutes")}{" "}
            </>
          ) : recovery ? (
            authCopy("resetHint")
          ) : method === "password" ? (
            authCopy("loginHint")
          ) : (
            t("Copy.enterYourMobileNumberToReceiveA")
          )}
        </CardDescription>
      </CardHeader>
      <CardContent
        className={client === "application" ? "grid gap-6 px-0" : "grid gap-6"}
      >
        {!recovery && !challenge && (
          <div
            className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
            role="group"
            aria-label={authCopy("method")}
          >
            {(["otp", "password"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant={method === value ? "default" : "ghost"}
                aria-pressed={method === value}
                disabled={busy}
                onClick={() => {
                  setMethod(value);
                  setAttempted(false);
                  setError(null);
                  setPassword("");
                }}
              >
                {authCopy(value === "otp" ? "withOtp" : "withPassword")}
              </Button>
            ))}
          </div>
        )}
        {client !== "application" && policyNotice}
        <form noValidate onSubmit={submit} className="grid gap-6">
          <FieldGroup>
            {challenge ? (
              <Field>
                <FieldLabel htmlFor={codeId}>
                  {t("Copy.verificationCode")}
                </FieldLabel>
                <div dir="ltr">
                  <InputOTP
                    id={codeId}
                    data-auth-field="code"
                    aria-invalid={!!fieldErrors.code || undefined}
                    aria-describedby={
                      fieldErrors.code ? `${codeId}-error` : undefined
                    }
                    autoFocus
                    disabled={busy}
                    maxLength={5}
                    value={code}
                    onChange={(value) => setCode(digits(value))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9۰-۹٠-٩]*"
                    pasteTransformer={digits}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="size-12 text-xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {fieldErrors.code && (
                  <LoginFieldError id={`${codeId}-error`}>
                    {validationCopy(fieldErrors.code)}
                  </LoginFieldError>
                )}
              </Field>
            ) : (
              <LoginField
                label={t("Copy.mobileNumber")}
                field="phone"
                disabled={busy}
                error={fieldErrors.phone && validationCopy(fieldErrors.phone)}
                value={phone}
                onChange={(e) => setPhone(digits(e.target.value))}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("Copy.phonePlaceholder")}
                dir="ltr"
                required
                maxLength={20}
              />
            )}
            {method === "password" && (
              <LoginField
                label={authCopy("password")}
                field="password"
                disabled={busy}
                error={
                  fieldErrors.password && validationCopy(fieldErrors.password)
                }
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={128}
              />
            )}
            <ErrorNotice error={error} />
          </FieldGroup>
          <Submit
            busy={busy}
            disabled={
              (!!challenge && code.length !== 5) ||
              (!challenge && method === "otp" && remaining > 0)
            }
          >
            {challenge || method === "password"
              ? t("Copy.verifyAndSignIn")
              : t("Copy.getSignInCode")}
            <ArrowLeft data-icon="inline-end" className="ltr:rotate-180" />
          </Submit>
        </form>
        {method === "password" && (
          <Link
            href={passwordRecoveryHref(returnPath)}
            className="inline-flex min-h-11 items-center justify-center text-sm underline underline-offset-4"
          >
            {authCopy("forgot")}
          </Link>
        )}
        {client === "application" && !challenge && policyNotice}
        {challenge && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                autofill.stop();
                setChallenge(null);
                setAttempted(false);
                setCode("");
                setError(null);
              }}
            >
              {t("Copy.editNumber")}{" "}
            </Button>
            <Button
              variant="ghost"
              disabled={busy || remaining > 0}
              onClick={() => void requestCode()}
            >
              {remaining > 0
                ? t("Copy.resendCountdown", { seconds: remaining })
                : t("Copy.resendCode")}
            </Button>
          </div>
        )}
        {client !== "application" && (
          <FieldDescription className="text-center leading-7">
            {admin
              ? t("Copy.onlyAccountsWithPlatformManagementAccessCan")
              : t("Copy.coachesAndAthletesUseOneAccountClub")}
          </FieldDescription>
        )}
      </CardContent>
    </Card>
  );
  if (client === "application")
    return (
      <MobileAuth
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
  return (
    <main
      data-gym-auth
      dir={getDirection(locale)}
      className="min-h-dvh bg-background p-5 sm:p-8"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 text-xl font-semibold"
          >
            <Logo size={28} className="shrink-0 text-primary" />
            <span dir="ltr">
              {t("Copy.brand")}{" "}
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                {business
                  ? t("Copy.businessBrand")
                  : admin
                    ? t("Copy.adminBrand")
                    : ""}
              </span>
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {admin
              ? t("Copy.platformManagement")
              : t("Copy.yourTrainingCompanion")}
          </span>
        </header>
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2">
          {
            <section className="hidden flex-col gap-8 lg:flex">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-7" />
              </div>
              <h2 className="max-w-lg text-5xl font-semibold leading-snug tracking-tight">
                {business ? (
                  <>
                    {t("Copy.manageYourClub")} <br />
                    {t("Copy.inOnePlace")}{" "}
                  </>
                ) : (
                  <>
                    {t("Copy.aClearerView")} <br />
                    {t("Copy.betterManagement")}{" "}
                  </>
                )}
              </h2>
              <p className="max-w-md text-lg leading-9 text-muted-foreground">
                {business
                  ? t("Copy.manageOrganizationsBranchesAndYourTeamIn")
                  : t("Copy.reviewUsersAndOrganizationsAndKeepAdministrative")}
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>{t("Copy.oneSharedAccount")}</span>
                <span>{t("Copy.clearAccess")}</span>
                <span>{t("Copy.secureSignIn")}</span>
              </div>
            </section>
          }
          {form}
        </div>
        <footer className="py-4 text-center text-xs text-muted-foreground">
          {t("Copy.gym4meOneStepBetterEveryDay")}{" "}
        </footer>
      </div>
    </main>
  );
}
