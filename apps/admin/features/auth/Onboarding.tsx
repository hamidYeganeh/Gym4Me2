"use client";

import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Input } from "@repo/ui/kit/input";
import { Label } from "@repo/ui/kit/label";
import { useRetryAfter } from "@repo/ui/lib/use-retry-after";

import { useApiRequest } from "../../lib/admin-api";
import { PageTransition } from "../../lib/PageTransition";
import { normalizeDigits, normalizeIranianMobile } from "../../lib/phone";
import { onboardingClasses } from "./onboarding-classes";
import { submitOtp } from "./otp";

const interests = ["strength", "cardio", "yoga", "pilates", "swimming", "functional"] as const;
const steps = ["phone", "code", "password", "name", "age", "username", "interests"] as const;
type Step = (typeof steps)[number];
export const Onboarding = (props: { completion?: boolean; hasPassword?: boolean }) => {
  const otp = useMutation({
    mutationFn: (args: Parameters<typeof submitOtp>) => submitOtp(...args),
  });
  const request = useApiRequest();
  const { completion = false, hasPassword = false } = props;
  const firstStep =
    completion ?
      hasPassword ? 3
      : 2
    : 0;
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [index, setIndex] = useState(firstStep);
  const defaults = { phone: "", code: "", password: "", name: "", age: "", username: "" };
  const toast = Toast.useToastManager();
  const [selected, setSelected] = useState<string[]>([]);
  const [existingPassword, setExistingPassword] = useState(hasPassword);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step: Step = steps[index]!;
  const schema = z
    .object({
      phone: z.string(),
      code: z.string(),
      password: z.string(),
      name: z.string(),
      age: z.string(),
      username: z.string(),
    })
    .superRefine((values, context) => {
      const reject = (key: keyof typeof values, message: string) =>
        context.addIssue({ code: "custom", path: [key], message });
      if (step === "phone" && !normalizeIranianMobile(values.phone))
        reject("phone", t("invalidPhone"));
      if (step === "code" && !/^[0-9]{6}$/.test(values.code)) reject("code", t("invalidCode"));
      if (step === "password" && values.password.length < 8)
        reject("password", t("invalidPassword"));
      if (step === "name" && !values.name.trim()) reject("name", t("invalidName"));
      if (step === "age" && (!/^\d{1,3}$/.test(values.age) || +values.age < 1 || +values.age > 120))
        reject("age", t("invalidAge"));
      if (step === "username" && !/^[\p{L}\p{N}_.-]{3,32}$/u.test(values.username))
        reject("username", t("invalidUsername"));
    });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = { ...defaults, ...useWatch({ control: form.control }) };
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);
  const move = (next: number) => {
    setError("");
    startTransition(() => setIndex(next));
  };
  const update = (key: keyof typeof values, value: string) => {
    setError("");
    form.setValue(key, value);
  };

  const retry = useRetryAfter(step);

  const submit = form.handleSubmit(
    async (values) => {
      if (pending || retry.remaining) return;
      setError("");
      const phone = normalizeIranianMobile(values.phone);
      if (step === "interests" && selected.length < 3) return setError(t("chooseThree"));
      setPending(true);
      try {
        if (step === "phone" || step === "code") {
          const response = await otp.mutateAsync([
            step === "phone" ? "request" : "verify",
            {
              phone: phone!,
              ...(step === "code" ? { code: values.code } : {}),
            },
          ]);
          if (retry.capture(response)) return;
          if (!response.ok) {
            setError(
              t(
                step === "code" && [400, 401, 422].includes(response.status) ?
                  "invalidCode"
                : "unavailable",
              ),
            );
            return;
          }
          if (step === "phone") {
            retry.clear("code");
            update("phone", phone!);
          }
          if (step === "code") {
            const session = (await response.json()) as {
              accountComplete: boolean;
              hasPassword: boolean;
            };
            if (session.accountComplete) {
              router.replace("/");
              return;
            }
            update("code", "");
            setExistingPassword(session.hasPassword);
            if (session.hasPassword) {
              move(index + 2);
              return;
            }
          }
        }
        if (step === "interests") {
          const response = await request([
            "/api/auth/account/complete",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: values.name.trim(),
                username: values.username,
                age: Number(values.age),
                interests: selected,
                ...(!existingPassword ? { password: values.password } : {}),
              }),
            },
          ]);
          if (retry.capture(response)) return;
          if (!response.ok) {
            setError(
              t(
                response.status === 409 ? "usernameTaken"
                : response.status === 401 ? "signInAgain"
                : "unavailable",
              ),
            );
            return;
          }
          form.setValue("password", "");
          router.replace("/");
          return;
        }
        move(index + 1);
      } catch {
        setError(t("unavailable"));
        toast.add({ title: t("unavailable"), type: "error" });
      } finally {
        setPending(false);
      }
    },
    (errors) => setError(Object.values(errors)[0]?.message ?? t("unavailable")),
  );
  return (
    <div className={onboardingClasses.flow}>
      <div
        className={onboardingClasses.progress}
        aria-label={t("progress", { current: index + 1, total: steps.length })}
      >
        {steps.map((name, i) => (
          <span key={name} data-active={i <= index} />
        ))}
      </div>
      <PageTransition effect="fade" pageKey={step}>
        <form
          method="post"
          onSubmit={(event) => void submit(event)}
          noValidate
          className={onboardingClasses.form}
          aria-busy={pending}
        >
          <div className={onboardingClasses.heading}>
            <h1 ref={heading} tabIndex={-1}>
              {t(`${step}.title`)}
            </h1>
            <p>{t(`${step}.description`)}</p>
          </div>
          {step === "interests" ?
            <div className={onboardingClasses.interests}>
              {interests.map((interest) => (
                <AnimatedButton
                  key={interest}
                  type="button"
                  color={selected.includes(interest) ? "primary" : "neutral"}
                  variant={selected.includes(interest) ? "contained" : "outlined"}
                  radius="full"
                  aria-pressed={selected.includes(interest)}
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(interest) ?
                        current.filter((item) => item !== interest)
                      : [...current, interest],
                    )
                  }
                >
                  {t(`topics.${interest}`)}
                </AnimatedButton>
              ))}
            </div>
          : <div className={onboardingClasses.field}>
              <Label htmlFor={"onboarding-" + step} className="sr-only">
                {t(`${step}.label`)}
              </Label>
              <Input
                key={step}
                id={"onboarding-" + step}
                value={values[step]}
                onChange={(event) =>
                  update(
                    step,
                    step === "age" || step === "code" ?
                      normalizeDigits(event.target.value)
                    : event.target.value,
                  )
                }
                type={
                  step === "password" && !showPassword ? "password"
                  : step === "phone" ?
                    "tel"
                  : "text"
                }
                inputMode={
                  step === "phone" ? "tel"
                  : step === "age" || step === "code" ?
                    "numeric"
                  : "text"
                }
                dir={step === "name" ? undefined : "ltr"}
                autoComplete={
                  step === "phone" ? "tel"
                  : step === "code" ?
                    "one-time-code"
                  : step === "password" ?
                    "new-password"
                  : step === "name" ?
                    "name"
                  : step === "username" ?
                    "username"
                  : "off"
                }
                placeholder={t(`${step}.label`)}
                size="xl"
                radius="full"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "onboarding-error" : undefined}
                maxLength={
                  step === "code" ? 6
                  : step === "age" ?
                    3
                  : undefined
                }
              />
              {step === "password" && (
                <AnimatedButton
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {t(showPassword ? "hidePassword" : "showPassword")}
                </AnimatedButton>
              )}
            </div>
          }
          <p id="onboarding-error" role="alert" className={onboardingClasses.error}>
            {error}
          </p>
          {retry.remaining > 0 && (
            <p role="status" className={onboardingClasses.error}>
              <span className="sr-only">{t("rateLimitNotice")}</span>
              <span aria-hidden="true">{t("rateLimited", { seconds: retry.remaining })}</span>
            </p>
          )}
          <AnimatedButton
            type="submit"
            size="xl"
            radius="full"
            fullWidth
            disabled={pending || retry.remaining > 0}
            loading={pending}
          >
            {t(
              step === "interests" ? "finish"
              : step === "phone" ? "sendCode"
              : step === "code" ? "verify"
              : "next",
            )}
          </AnimatedButton>
          {index > firstStep && (
            <AnimatedButton
              type="button"
              variant="text"
              color="neutral"
              disabled={pending}
              onClick={() => move(index - (step === "name" && existingPassword ? 2 : 1))}
            >
              {t("back")}
            </AnimatedButton>
          )}
        </form>
      </PageTransition>
    </div>
  );
};
