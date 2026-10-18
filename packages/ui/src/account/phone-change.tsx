"use client";
import { useApiContext } from "@repo/api/provider";
import { useEffect, useState, type FormEvent } from "react";
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
import { TextField, Submit, ErrorNotice } from "./common";
const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
export function PhoneChange() {
  const { api } = useApiContext();
  const loginHref =
    api.scope[2] === "application"
      ? "/auth/otp?returnTo=%2Fprofile"
      : "/login?returnTo=%2Fprofile";
  const t = useTranslations("PhoneChange");
  const router = useRouter();
  const request = useRequestPhoneChange();
  const verify = useVerifyPhoneChange();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const autofill = useOtpAutofill(setCode);
  const [challengeId, setChallengeId] = useState<string>();
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function send() {
    try {
      setCode("");
      await autofill.begin();
      const result = await request.mutateAsync({ phone });
      setChallengeId(result.challengeId);
      setDeadline(Date.now() + result.retryAfter * 1000);
    } catch {
      autofill.stop();
      /* The error notice shows the localized server code. */
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return send();
    try {
      await verify.mutateAsync({ challengeId, code });
      autofill.stop();
      router.replace(loginHref);
    } catch {
      /* Keep entered fields on failure. */
    }
  }
  const busy = request.isPending || verify.isPending;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={submit} className="grid gap-4">
          <TextField
            name="newPhone"
            label={t("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(event) => setPhone(digits(event.target.value))}
            readOnly={Boolean(challengeId)}
            required
            maxLength={20}
          />
          {challengeId && (
            <TextField
              name="phoneCode"
              label={t("code")}
              value={code}
              onChange={(event) => setCode(digits(event.target.value))}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              required
              minLength={5}
              maxLength={5}
              pattern="[0-9]{5}"
            />
          )}
          <ErrorNotice error={request.error ?? verify.error} />
          <Submit
            busy={busy}
            disabled={challengeId ? code.length !== 5 : remaining > 0}
          >
            {t(challengeId ? "confirm" : "send")}
          </Submit>
        </form>
        {challengeId && (
          <div className="flex gap-3">
            <Button
              variant="ghost"
              disabled={busy || remaining > 0}
              onClick={() => void send()}
            >
              {remaining ? t("countdown", { seconds: remaining }) : t("resend")}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                autofill.stop();
                setChallengeId(undefined);
                setCode("");
              }}
            >
              {t("edit")}
            </Button>
          </div>
        )}
        <Button asChild variant="link" className="w-fit">
          <Link href={loginHref}>{t("signInAgain")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
