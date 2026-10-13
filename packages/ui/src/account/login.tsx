"use client";
import { useTranslations, useLocale, getDirection } from "@repo/i18n";

import { useRequestOtp, useVerifyOtp, usePasswordLogin } from "@repo/api/auth";
import { ApiError, type ApiApplication as Client } from "@repo/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Dumbbell, ShieldCheck, Smartphone } from "lucide-react";
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

import { ErrorNotice, Submit, TextField } from "./common";
import { MobileAuth } from "./mobile-auth";
import { useOtpAutofill } from "./otp-autofill";
import { safeReturnPath } from "./safe-return-path";
const digits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));
export function LoginPage({
  client,
  recovery = false,
}: {
  client: Client;
  recovery?: boolean;
}) {
  const t = useTranslations();
  const authCopy = useTranslations("Password");
  const locale = useLocale();

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const passwordLogin = usePasswordLogin();
  const [method, setMethod] = useState<"otp" | "password">("otp");
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
  const [returnPath, setReturnPath] = useState(
    client === "application" ? "/profile" : "/",
  );
  useEffect(() => {
    setReturnPath(
      safeReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
        client === "application" ? "/profile" : "/",
      ),
    );
  }, [client]);
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
    setBusy(true);
    setError(null);
    try {
      setCode("");
      await autofill.begin();
      const result = await requestOtp.mutateAsync({ phone: digits(phone) });
      setChallenge(result.challengeId);
      setDeadline(Date.now() + result.retryAfter * 1000);
    } catch (err) {
      autofill.stop();
      setError(err instanceof Error ? err.message : "Copy.couldNotSendCode");
      if (err instanceof ApiError && err.status === 429)
        setDeadline(Date.now() + 60000);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!challenge && method === "otp") return requestCode();
    if (method === "password") {
      setBusy(true);
      setError(null);
      try {
        await passwordLogin.mutateAsync({ phone: digits(phone), password });
        setPassword("");
        router.replace(returnPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Copy.couldNotSignIn");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const verified = await verifyOtp.mutateAsync({
        challengeId: challenge,
        code,
      });
      autofill.stop();
      router.replace(
        recovery
          ? "/set-password"
          : client === "application" && !verified.user.displayName
            ? `/profile/complete?returnTo=${encodeURIComponent(returnPath)}`
            : safeReturnPath(
                new URLSearchParams(window.location.search).get("returnTo"),
                client === "application" ? "/profile" : "/",
              ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy.couldNotSignIn");
    } finally {
      setBusy(false);
    }
  }
  const policyNotice = (
    <p className="text-sm leading-7 text-muted-foreground">
      {t("Privacy.loginNotice")}{" "}
      <Link
        href={
          client === "application"
            ? `/privacy?from=login&returnTo=${encodeURIComponent(returnPath)}`
            : "/privacy"
        }
        className="underline underline-offset-4"
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
          {recovery
            ? authCopy("resetTitle")
            : challenge
              ? t("Copy.enterVerificationCode")
              : admin
                ? t("Copy.signInToAdmin")
                : business
                  ? t("Copy.signInToBusiness")
                  : t("Copy.welcomeToGym4me")}
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
        <form onSubmit={submit} className="grid gap-6">
          <FieldGroup>
            {challenge ? (
              <Field>
                <FieldLabel htmlFor="otp">
                  {t("Copy.verificationCode")}
                </FieldLabel>
                <div dir="ltr">
                  <InputOTP
                    id="otp"
                    autoFocus
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
              </Field>
            ) : (
              <TextField
                label={t("Copy.mobileNumber")}
                name="phone"
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
              <TextField
                label={authCopy("password")}
                name="password"
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
            href="/reset-password"
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
        setCode={setCode}
        password={password}
        setPassword={setPassword}
        method={method}
        setMethod={(value) => {
          setMethod(value);
          setPassword("");
          setError(null);
        }}
        challenge={challenge}
        remaining={remaining}
        busy={busy}
        error={error}
        recovery={recovery}
        submit={submit}
        resend={() => void requestCode()}
        editPhone={() => {
          autofill.stop();
          setChallenge(null);
          setCode("");
          setError(null);
        }}
        policy={policyNotice}
      />
    );
  return (
    <main
      dir={getDirection(locale)}
      className="min-h-dvh bg-background p-5 sm:p-8"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold"
          >
            <Dumbbell className="size-7 text-primary" />
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
              <h1 className="max-w-lg text-5xl font-semibold leading-snug tracking-tight">
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
              </h1>
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
