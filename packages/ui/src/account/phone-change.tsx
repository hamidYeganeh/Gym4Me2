"use client";
import { useApiContext } from "@repo/api/provider";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequestPhoneChange, useVerifyPhoneChange } from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/kit/Card";
import { Button } from "@repo/ui/kit/Button";
import { useOtpAutofill } from "./otp-autofill";
import { TextField, Submit, QueryError } from "./common";
import { sessionSignInHref } from "../lib/session-navigation";
import { normalizeLoginDigits as digits } from "./login-validation";
import { useActionFocus } from "../hooks/use-action-focus";
export function PhoneChange() {
  const { api } = useApiContext();
  const loginHref = sessionSignInHref(api.scope[2], "/profile");
  const pending = useRef(false);
  const generation = useRef(0);
  const phoneInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const t = useTranslations("PhoneChange");
  const router = useRouter();
  const request = useRequestPhoneChange();
  const verify = useVerifyPhoneChange();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const autofill = useOtpAutofill(setCode);
  const [challengeId, setChallengeId] = useState<string>();
  const [deadline, setDeadline] = useState(0);
  const retryAt = useRef(0);
  const [remaining, setRemaining] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const busy = preparing || request.isPending || verify.isPending;
  const beginFocus = useActionFocus(busy);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function send() {
    if (pending.current || Date.now() < retryAt.current) return;
    pending.current = true;
    setPreparing(true);
    const current = generation.current;
    const origin = document.activeElement;
    let sent = false;
    const finishFocus = beginFocus(() =>
      sent
        ? codeInput.current
        : origin instanceof HTMLElement
          ? origin
          : phoneInput.current,
    );
    try {
      request.reset();
      verify.reset();
      setCode("");
      await autofill.begin();
      if (current !== generation.current) return;
      const result = await request.mutateAsync({ phone });
      if (current !== generation.current) return;
      setChallengeId(result.challengeId);
      retryAt.current = Date.now() + result.retryAfter * 1000;
      setDeadline(retryAt.current);
      sent = true;
    } catch {
      autofill.stop();
      /* The error notice shows the localized server code. */
    } finally {
      pending.current = false;
      setPreparing(false);
      if (current === generation.current) {
        finishFocus();
      }
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return send();
    if (pending.current || !/^\d{5}$/.test(code)) return;
    pending.current = true;
    const current = generation.current;
    const finishFocus = beginFocus(() => codeInput.current);
    try {
      await verify.mutateAsync({ challengeId, code });
      autofill.stop();
      if (current === generation.current) router.replace(loginHref);
    } catch {
      /* Keep entered fields on failure. */
    } finally {
      pending.current = false;
      if (current === generation.current) finishFocus();
    }
  }
  const error = verify.error ?? request.error;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={submit} className="grid gap-4">
          <TextField
            ref={phoneInput}
            id={`${id}-phone`}
            name="newPhone"
            className="min-h-11"
            label={t("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(event) => {
              if (request.error) request.reset();
              setPhone(digits(event.target.value));
            }}
            readOnly={Boolean(challengeId)}
            disabled={busy}
            aria-describedby={
              error && !challengeId
                ? `${id}-error`
                : remaining > 0 && !challengeId
                  ? `${id}-cooldown`
                  : undefined
            }
            required
            maxLength={20}
          />
          {challengeId && (
            <TextField
              ref={codeInput}
              id={`${id}-code`}
              name="phoneCode"
              className="min-h-11"
              label={t("code")}
              value={code}
              onChange={(event) => {
                if (verify.error) verify.reset();
                if (request.error) request.reset();
                setCode(digits(event.target.value));
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              required
              minLength={5}
              maxLength={5}
              pattern="[0-9]{5}"
              disabled={busy}
              aria-invalid={
                verify.error?.code === "Backend.theCodeIsIncorrectOrExpired" ||
                undefined
              }
              aria-describedby={error ? `${id}-error` : undefined}
            />
          )}
          <div id={`${id}-error`}>
            <QueryError error={error} />
          </div>
          <Submit
            busy={busy}
            disabled={challengeId ? code.length !== 5 : remaining > 0}
            className="min-h-11"
          >
            {t(challengeId ? "confirm" : "send")}
          </Submit>
          {!challengeId && remaining > 0 && (
            <p
              id={`${id}-cooldown`}
              aria-live="off"
              className="text-sm text-muted-foreground"
            >
              {t("countdown", { seconds: remaining })}
            </p>
          )}
        </form>
        {challengeId && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              className="min-h-11"
              disabled={busy || remaining > 0}
              onClick={() => void send()}
            >
              {remaining ? t("countdown", { seconds: remaining }) : t("resend")}
            </Button>
            <Button
              variant="ghost"
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                if (pending.current) return;
                const finishFocus = beginFocus(() => phoneInput.current);
                autofill.stop();
                setChallengeId(undefined);
                setCode("");
                request.reset();
                verify.reset();
                finishFocus();
              }}
            >
              {t("edit")}
            </Button>
          </div>
        )}
        <Button asChild variant="link" className="min-h-11 w-fit">
          <Link href={loginHref}>{t("signInAgain")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
