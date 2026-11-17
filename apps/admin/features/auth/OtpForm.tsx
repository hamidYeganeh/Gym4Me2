"use client";

import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
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
  const otp = useMutation({
    mutationFn: (args: Parameters<typeof submitOtp>) => submitOtp(...args),
  });
  const t = useTranslations("Auth");
  const router = useRouter();
  const [phone, setPhone] = useState<string>();
  const toast = Toast.useToastManager();
  const schema = z.object({
    input:
      phone ? z.string() : z.string().refine((value) => Boolean(normalizeIranianMobile(value))),
    code:
      phone ?
        z
          .string()
          .length(otpLength)
          .regex(/^[0-9]+$/)
      : z.string(),
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { input: "", code: "" } });
  const { input, code } = useWatch({ control: form.control });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"phone" | "code" | "unavailable">();

  const retry = useRetryAfter(phone ? "verify" : "request");

  const submit = form.handleSubmit(
    async ({ input, code }) => {
      if (pending || retry.remaining) return;
      const normalized = phone ?? normalizeIranianMobile(input);
      if (!normalized) return;

      setPending(true);
      setError(undefined);
      try {
        const response =
          phone ?
            await otp.mutateAsync(["verify", { phone, code }])
          : await otp.mutateAsync(["request", { phone: normalized }]);
        if (retry.capture(response)) return;
        if (!response.ok) {
          setError(phone && [400, 401, 422].includes(response.status) ? "code" : "unavailable");
          return;
        }
        if (phone) {
          router.replace("/");
        } else {
          retry.clear("verify");
          setPhone(normalized);
        }
      } catch {
        setError("unavailable");
        toast.add({ title: t("unavailable"), type: "error" });
      } finally {
        setPending(false);
      }
    },
    () => setError(phone ? "code" : "phone"),
  );

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
        onSubmit={(event) => void submit(event)}
        className={authClasses.fields}
        aria-busy={pending}
      >
        {phone ?
          <div
            dir="ltr"
            className={authClasses.otpCode}
            data-invalid={error === "code" || undefined}
          >
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
              value={code ?? ""}
              onChange={(value) => {
                form.setValue("code", normalizeDigits(value));
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
              value={input ?? ""}
              onChange={(event) => {
                form.setValue("input", event.target.value);
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
            pending ||
            retry.remaining > 0 ||
            (phone ? (code ?? "").length < otpLength : !(input ?? "").trim())
          }
          loading={pending}
          className={authClasses.submit}
        >
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
              form.setValue("code", "");
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
